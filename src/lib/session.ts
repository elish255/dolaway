export type Registration = { name:string; username:string; email:string; phone:string; country?:string };
export const ACTIVATION_FEE = Number(import.meta.env.VITE_ACTIVATION_FEE || "14500");
export const LIPA_NUMBER = String(import.meta.env.VITE_LIPA_NUMBER || "251161660");
export const LIPA_BUSINESS = String(import.meta.env.VITE_LIPA_BUSINESS || "DOLAWAY");
const KEY = "dolaway_registration";
export function saveRegistration(r:Registration){ if(typeof window!=="undefined") localStorage.setItem(KEY,JSON.stringify(r)); }
export function loadRegistration():Registration|null{ if(typeof window==="undefined")return null; try{const raw=localStorage.getItem(KEY);return raw?JSON.parse(raw) as Registration:null;}catch{return null;} }
export function clearRegistration(){ if(typeof window!=="undefined")localStorage.removeItem(KEY); }
