import React, { useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import { socketService } from "../services/socket";

interface MapCanvasProps {
    serverUrl: string;
    token: string;
    currentUsername: string;
}

export const MapCanvas: React.FC<MapCanvasProps> = ({ serverUrl, token, currentUsername }) => {
    const gameContainerRef = useRef<HTMLDivElement>(null);
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    
    const [uiInviteActive, setUiInviteActive] = useState(false);
    const [isCallActive, setIsCallActive] = useState(false);
    const [activePeerName, setActivePeerName] = useState("");

    const pendingPeerIdRef = useRef<string | null>(null);
    const currentActivePeerIdRef = useRef<string | null>(null);
    const isCallActiveRef = useRef<boolean>(false);
    const uiInviteActiveRef = useRef<boolean>(false);

    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);

    const mapConfig = {
        mapKey: "sandbox-map",
        jsonPath: "/maps/map.json",
        tilesets: [{ tiledName: "tileset", imageKey: "tileset", path: "/tilesets/tileset.png" }]
    };

    const spriteConfig = {
        spriteKey: "player",
        path: "/sprites/player.png",
        frameWidth: 64,
        frameHeight: 64
    };

    useEffect(() => {
        if (!gameContainerRef.current) return;

        const socketInstance = socketService.connect(serverUrl, token);

        class CityScene extends Phaser.Scene {
            private player!: Phaser.GameObjects.Sprite;
            private playerLabel!: Phaser.GameObjects.Text;
            private otherPlayers: Record<string, Phaser.GameObjects.Sprite & { 
                label?: Phaser.GameObjects.Text, 
                movementTween?: Phaser.Tweens.Tween,
                username: string,
                inProximityRange?: boolean,
                ignoredProximity?: boolean
            }> = {};
            private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

            private playerTileX: number = 6;
            private playerTileY: number = 6;
            private isMoving: boolean = false;
            private speedDuration: number = 150;
            private blockedTileIDs = new Set([98, 96, 44]);

            private map!: Phaser.Tilemaps.Tilemap;
            private layer!: Phaser.Tilemaps.TilemapLayer | Phaser.Tilemaps.TilemapGPULayer;

            constructor() { super({ key: "CityScene" }); }

            preload() {
                this.load.tilemapTiledJSON("map", mapConfig.jsonPath);
                mapConfig.tilesets.forEach(ts => this.load.image(ts.imageKey, ts.path));
                this.load.spritesheet(spriteConfig.spriteKey, spriteConfig.path, {
                    frameWidth: spriteConfig.frameWidth,
                    frameHeight: spriteConfig.frameHeight
                });
            }

            create() {
                this.map = this.make.tilemap({ key: "map" });
                const tileset = this.map.addTilesetImage("tileset", "tileset") as Phaser.Tilemaps.Tileset;
                this.layer = this.map.createLayer("Tile Layer 1", tileset, 0, 0)!;

                this.createPlayerAnimations();

                this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
                this.cameras.main.setZoom(1.5);
                if (this.input.keyboard) this.cursors = this.input.keyboard.createCursorKeys();

                socketService.onCurrentPlayers((players) => {
                    Object.keys(players).forEach((id) => {
                        if (id === socketService.getSocketId()) {
                            if (!this.player) this.spawnLocalPlayer(players[id].x || 192, players[id].y || 192);
                        } else {
                            this.spawnRemotePlayer(id, players[id].x, players[id].y, players[id].username);
                        }
                    });
                });

                socketService.onNewPlayer((playerInfo) => {
                    if (playerInfo.playerId !== socketService.getSocketId()) {
                        this.spawnRemotePlayer(playerInfo.playerId, playerInfo.x, playerInfo.y, playerInfo.username);
                    }
                });

                socketService.onPlayerMoved((playerInfo) => {
                    const otherPlayer = this.otherPlayers[playerInfo.playerId];
                    if (otherPlayer) {
                        if (otherPlayer.movementTween) otherPlayer.movementTween.stop();

                        const dx = playerInfo.x - otherPlayer.x;
                        const dy = playerInfo.y - otherPlayer.y;
                        if (dx === 0 && dy === 0) return;

                        let animation = "walk-down";
                        if (Math.abs(dx) > Math.abs(dy)) {
                            animation = dx > 0 ? "walk-right" : "walk-left";
                        } else {
                            animation = dy > 0 ? "walk-down" : "walk-up";
                        }

                        otherPlayer.play(animation, true);

                        otherPlayer.movementTween = this.tweens.add({
                            targets: otherPlayer,
                            x: playerInfo.x,
                            y: playerInfo.y,
                            duration: this.speedDuration,
                            onUpdate: () => {
                                if (otherPlayer.label) {
                                    otherPlayer.label.setPosition(otherPlayer.x, otherPlayer.y - 52);
                                }
                            },
                            onComplete: () => {
                                otherPlayer.anims.stop();
                            }
                        });
                    }
                });

                socketService.onPlayerDisconnected((playerId) => {
                    const otherPlayer = this.otherPlayers[playerId];
                    if (otherPlayer) {
                        if (otherPlayer.label) otherPlayer.label.destroy();
                        otherPlayer.destroy();
                        delete this.otherPlayers[playerId];
                    }
                    if (currentActivePeerIdRef.current === playerId || pendingPeerIdRef.current === playerId) {
                        handleCloseCall();
                    }
                });

                // ---------------- WEBRTC SIGNALING HANDLERS ----------------
                socketInstance.on("video-offer", async (data: { senderId: string; offer: any }) => {
                    if (isCallActiveRef.current) return;
                    
                    const remoteUser = this.otherPlayers[data.senderId]?.username || "Someone";
                    pendingPeerIdRef.current = data.senderId;
                    setActivePeerName(remoteUser);
                    
                    uiInviteActiveRef.current = true;
                    setUiInviteActive(true);
                    
                    (window as any).pendingWebRTCOffer = data.offer;
                });

                socketInstance.on("video-answer", async (data: { answer: any }) => {
                    if (peerConnectionRef.current) {
                        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
                    }
                });

                socketInstance.on("ice-candidate", async (data: { candidate: any }) => {
                    if (peerConnectionRef.current) {
                        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
                    }
                });

                socketInstance.on("video-hangup", () => {
                    handleCloseCall();
                });

                socketInstance.emit("player-ready");
            }

            createPlayerAnimations() {
                const animsConfig = [
                    { key: "walk-down", start: 0, end: 5 },
                    { key: "walk-left", start: 6, end: 11 },
                    { key: "walk-right", start: 12, end: 17 },
                    { key: "walk-up", start: 18, end: 23 }
                ];
                animsConfig.forEach(cfg => {
                    if (!this.anims.exists(cfg.key)) {
                        this.anims.create({
                            key: cfg.key,
                            frames: this.anims.generateFrameNumbers(spriteConfig.spriteKey, { start: cfg.start, end: cfg.end }),
                            frameRate: 10,
                            repeat: -1
                        });
                    }
                });
            }

            spawnLocalPlayer(x: number, y: number) {
                this.playerTileX = Math.floor((x - 16) / 32) || 6;
                this.playerTileY = Math.floor((y - 32) / 32) || 6;

                const startX = (this.playerTileX * 32) + 16;
                const startY = (this.playerTileY * 32) + 32;

                this.player = this.add.sprite(startX, startY, spriteConfig.spriteKey, 0);
                this.player.setScale(1.5);
                this.player.setOrigin(0.5, 1);
                this.player.setDepth(10);

                this.playerLabel = this.add.text(this.player.x, this.player.y - 52, currentUsername, {
                    fontSize: '11px', color: '#ffffff', backgroundColor: '#000000aa', padding: { x: 4, y: 2 }
                }).setOrigin(0.5);
                this.playerLabel.setDepth(11);

                this.cameras.main.startFollow(this.player);
            }

            spawnRemotePlayer(id: string, x: number, y: number, username: string) {
                if (this.otherPlayers[id]) return;

                const otherPlayer: any = this.add.sprite(x, y, spriteConfig.spriteKey, 0);
                otherPlayer.setScale(1.5);
                otherPlayer.setOrigin(0.5, 1);
                otherPlayer.setDepth(10);
                otherPlayer.playerId = id;
                otherPlayer.username = username || "Player";

                otherPlayer.label = this.add.text(x, y - 52, otherPlayer.username, {
                    fontSize: '11px', color: '#60a5fa', backgroundColor: '#000000aa', padding: { x: 4, y: 2 }
                }).setOrigin(0.5);
                otherPlayer.label.setDepth(11);

                this.otherPlayers[id] = otherPlayer;
            }

            update() {
                if (!this.player || !this.cursors) return;

                if (!this.isMoving) {
                    if (this.cursors.left?.isDown)       this.movePlayer(-1, 0, "walk-left");
                    else if (this.cursors.right?.isDown) this.movePlayer(1, 0, "walk-right");
                    else if (this.cursors.up?.isDown)    this.movePlayer(0, -1, "walk-up");
                    else if (this.cursors.down?.isDown)  this.movePlayer(0, 1, "walk-down");
                }

                this.checkProximityForVideo();
            }

            movePlayer(dx: number, dy: number, animation: string) {
                const targetTileX = this.playerTileX + dx;
                const targetTileY = this.playerTileY + dy;

                if (!this.isTileWalkable(targetTileX, targetTileY) || !this.isTileFree(targetTileX, targetTileY)) {
                    return;
                }

                this.isMoving = true;
                this.playerTileX = targetTileX;
                this.playerTileY = targetTileY;

                const targetX = (targetTileX * 32) + 16;
                const targetY = (targetTileY * 32) + 32;

                this.player.play(animation, true);

                this.tweens.add({
                    targets: this.player,
                    x: targetX,
                    y: targetY,
                    duration: this.speedDuration,
                    onUpdate: () => {
                        this.playerLabel.setPosition(this.player.x, this.player.y - 52);
                    },
                    onComplete: () => {
                        this.isMoving = false;
                        this.player.anims.stop();
                    }
                });

                socketService.emitMovement({ x: targetX, y: targetY, anim: animation });
            }

            checkProximityForVideo() {
                const proximityRadius = 96; 
                
                Object.keys(this.otherPlayers).forEach((id) => {
                    const op = this.otherPlayers[id];
                    const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, op.x, op.y);

                    if (distance <= proximityRadius) {
                        if (!op.inProximityRange) {
                            op.inProximityRange = true;
                            
                            if (!isCallActiveRef.current && !uiInviteActiveRef.current) {
                                pendingPeerIdRef.current = id;
                                setActivePeerName(op.username);
                                uiInviteActiveRef.current = true;
                                setUiInviteActive(true);
                            }
                        }
                    } else {
                        if (op.inProximityRange) {
                            op.inProximityRange = false;
                            
                            // UPDATED TRIGGER: If the call is actively running OR an invitation is open, 
                            // walking away tells the engine to automatically break down the link channel layers.
                            if (currentActivePeerIdRef.current === id) {
                                socketInstance.emit("video-hangup", { targetId: id });
                                handleCloseCall();
                            } else if (pendingPeerIdRef.current === id) {
                                handleCloseCall();
                            }
                        }
                    }
                });
            }

            isTileFree(tileX: number, tileY: number): boolean {
                for (const id in this.otherPlayers) {
                    const op = this.otherPlayers[id];
                    const opTileX = Math.floor((op.x - 16) / 32);
                    const opTileY = Math.floor((op.y - 32) / 32);
                    if (opTileX === tileX && opTileY === tileY) return false;
                }
                return true;
            }

            isTileWalkable(x: number, y: number): boolean {
                if (x < 0 || y < 0 || x >= this.map.width || y >= this.map.height) return false;
                const tile = (this.layer as any).getTileAt(x, y);
                if (!tile) return true;
                return !this.blockedTileIDs.has(tile.index);
            }
        }

        // ---------------- WEBRTC LOGIC INTERFACES ----------------
        const rtcConfig = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

        const prepareMedia = async () => {
            if (!localStreamRef.current) {
                localStreamRef.current = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                setTimeout(() => {
                    if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
                }, 100);
            }
            return localStreamRef.current;
        };

        (window as any).startManualOutboundCall = async () => {
            const targetId = pendingPeerIdRef.current;
            if (!targetId) return;

            uiInviteActiveRef.current = false;
            setUiInviteActive(false);
            
            isCallActiveRef.current = true;
            setIsCallActive(true);
            currentActivePeerIdRef.current = targetId;

            const stream = await prepareMedia();
            const pc = new RTCPeerConnection(rtcConfig);
            peerConnectionRef.current = pc;

            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    socketInstance.emit("ice-candidate", { targetId, candidate: event.candidate });
                }
            };

            pc.ontrack = (event) => {
                if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
            };

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socketInstance.emit("video-offer", { targetId, offer });
        };

        (window as any).acceptInboundCall = async () => {
            const senderId = pendingPeerIdRef.current;
            const offer = (window as any).pendingWebRTCOffer;
            if (!senderId || !offer) return;

            uiInviteActiveRef.current = false;
            setUiInviteActive(false);
            
            isCallActiveRef.current = true;
            setIsCallActive(true);
            currentActivePeerIdRef.current = senderId;

            const stream = await prepareMedia();
            const pc = new RTCPeerConnection(rtcConfig);
            peerConnectionRef.current = pc;

            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    socketInstance.emit("ice-candidate", { targetId: senderId, candidate: event.candidate });
                }
            };

            pc.ontrack = (event) => {
                if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
            };

            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socketInstance.emit("video-answer", { targetId: senderId, answer });
        };

        (window as any).triggerManualHangup = () => {
            const targetId = currentActivePeerIdRef.current || pendingPeerIdRef.current;
            if (targetId) {
                socketInstance.emit("video-hangup", { targetId });
            }
            handleCloseCall();
        };

        (window as any).dismissInviteUI = () => {
            uiInviteActiveRef.current = false;
            setUiInviteActive(false);
        };

        const handleCloseCall = () => {
            if (peerConnectionRef.current) {
                peerConnectionRef.current.close();
                peerConnectionRef.current = null;
            }
            if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
            
            currentActivePeerIdRef.current = null;
            pendingPeerIdRef.current = null;
            
            isCallActiveRef.current = false;
            setIsCallActive(false);
            
            uiInviteActiveRef.current = false;
            setUiInviteActive(false);
            
            setActivePeerName("");
            (window as any).pendingWebRTCOffer = null;
        };

        const gameInstance = new Phaser.Game({
            type: Phaser.AUTO,
            parent: gameContainerRef.current,
            scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH, width: "100%", height: "100%" },
            scene: [CityScene]
        });

        return () => {
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => track.stop());
            }
            socketService.disconnect();
            gameInstance.destroy(true);
        };
    }, [serverUrl, token, currentUsername]); 

    return (
        <div style={{ width: "100vw", height: "100vh", position: "relative", overflow: "hidden", backgroundColor: "#000", fontFamily: "sans-serif" }}>
            <div ref={gameContainerRef} style={{ width: "100%", height: "100%" }} />

            {/* 1. CALL PROMPT MODAL */}
            {uiInviteActive && !isCallActive && (
                <div style={{ position: "absolute", top: "20px", left: "50%", transform: "translateX(-50%)", backgroundColor: "#1e293b", color: "#fff", padding: "16px 24px", borderRadius: "12px", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", gap: "20px", border: "1px solid #475569" }}>
                    <div style={{ fontSize: "14px", fontWeight: "500" }}>
                        💡 <span style={{ color: "#38bdf8" }}>{activePeerName}</span> is nearby. Want to start video chat?
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                        <button 
                            onClick={() => {
                                if ((window as any).pendingWebRTCOffer) {
                                    (window as any).acceptInboundCall();
                                } else {
                                    (window as any).startManualOutboundCall();
                                }
                            }}
                            style={{ backgroundColor: "#22c55e", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "12px" }}
                        >
                            Connect Video
                        </button>
                        <button 
                            onClick={() => (window as any).dismissInviteUI()}
                            style={{ backgroundColor: "#ef4444", color: "#fff", border: "none", padding: "8px 14px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "12px" }}
                        >
                            Ignore
                        </button>
                    </div>
                </div>
            )}

            {/* 2. LIVE ACTIVE STREAM OVERLAY */}
            {isCallActive && (
                <div style={{ position: "absolute", bottom: "30px", right: "30px", display: "flex", flexDirection: "column", gap: "12px", zIndex: 100, backgroundColor: "#0f172acc", backdropFilter: "blur(4px)", padding: "14px", borderRadius: "16px", border: "1px solid #334155" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                        <div style={{ color: "#fff", fontSize: "12px", fontWeight: "bold" }}>
                            Live Call: <span style={{ color: "#38bdf8" }}>{activePeerName}</span>
                        </div>
                        <button 
                            onClick={() => (window as any).triggerManualHangup()}
                            style={{ backgroundColor: "#ef4444", color: "#fff", border: "none", padding: "4px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "11px", fontWeight: "bold" }}
                        >
                            End Call
                        </button>
                    </div>
                    <div style={{ display: "flex", gap: "10px" }}>
                        <div style={{ position: "relative" }}>
                            <video ref={localVideoRef} autoPlay playsInline muted style={{ width: "160px", height: "120px", objectFit: "cover", borderRadius: "8px", border: "2px solid #22c55e" }} />
                            <span style={{ position: "absolute", bottom: "6px", left: "6px", fontSize: "10px", color: "#fff", backgroundColor: "#000000aa", padding: "2px 6px", borderRadius: "4px" }}>You</span>
                        </div>
                        <div style={{ position: "relative" }}>
                            <video ref={remoteVideoRef} autoPlay playsInline style={{ width: "160px", height: "120px", objectFit: "cover", borderRadius: "8px", border: "2px solid #3b82f6" }} />
                            <span style={{ position: "absolute", bottom: "6px", left: "6px", fontSize: "10px", color: "#fff", backgroundColor: "#000000aa", padding: "2px 6px", borderRadius: "4px" }}>{activePeerName}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};