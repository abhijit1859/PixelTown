 import axios from "axios";
import { useAuthStore } from "../store/auth";
 


const BASE_URL="http://192.168.0.106:5000"


const api=axios.create({
    baseURL:BASE_URL,
    timeout:15000,
    headers:{'Content-Type':'application/json'}
})


api.interceptors.request.use((config)=>{
    try {
        const token=localStorage.getItem("accessToken")
    
        if(token){
            config.headers.Authorization=`Bearer ${token}`
        }
    
        return config
    } catch (error) {
        return Promise.reject(error)
    }
})

interface QueueItem{
    resolve:(token:string)=>void;
    reject:(token:string)=>void
}

let isRefreshing=false;
let failedQueue:Array<QueueItem>=[]




const processQueue=(error:unknown,token:string|null=null)=>{
    failedQueue.forEach((p)=>{
        if(error){
            p.reject(error)
        }else{
            p.resolve(token)
        }
    })
    failedQueue=[]
}


api.interceptors.response.use((response)=>response,async(error)=>{
    const originalRequest=error.config

    if(error.response?.status!=401||originalRequest._retry){
        return Promise.reject(error)
    }


    //if already refreshing then add the new requests in queue
    if(isRefreshing){
        return new Promise((resolve,reject)=>{
            failedQueue.push({
                resolve:(token:string)=>{
                    originalRequest.headers.Authorization=`Bearer ${token}`
                    resolve(api(originalRequest))
                },
                reject
            })
        })
    }


    originalRequest._retry=true;
    isRefreshing=true;

    try {
        const res=await axios.post(`${BASE_URL}/api/v1/refresh`,{},{withCredentials:true})
        const token=res.data.accessToken

        useAuthStore.getState().updateToken(token)

        originalRequest.headers.Authorization=`Bearer ${token}`

        //retry all the queued requests with the new token
        processQueue(null,token)

        return api(originalRequest)
    } catch (error) {

        processQueue(error,null)
        isRefreshing=false
        localStorage.removeItem('accessToken')

        return Promise.reject(error)
        
    }
})

export default api