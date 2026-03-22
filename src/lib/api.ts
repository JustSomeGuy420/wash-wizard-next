
export interface User {
  id: number
  name: string
  email: string
  role: string
  loyaltyPoints: number
}
 
export interface Appointment {
  id: number
  userId: number
  machineId: number
  startTime: string
  endTime: string
  status: string
  machine: Machine
}
 
export interface Machine {
  id: number
  machineNumber: number
  status: string
}
 
export interface Slot {
  id: number
  startTime: string
  endTime: string
}
 
export interface MachineWithSlots extends Machine {
  appointments: Slot[]
}
 
function getToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("token")
}
 
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken()
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(error.error ?? "Request failed")
  }
  if (res.status === 204) return undefined as T
  return res.json()
}
 
export const api = {
  auth: {
    register: (body: { name: string; email: string; studentId?: string; password: string }) =>
      request<User>("/api/auth/register", { method: "POST", body: JSON.stringify(body) }),
 
    login: (body: { email: string; password: string }) =>
      request<{ token: string; user: User }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(body),
      }),
  },
 
  machines: {
    list: () => request<Machine[]>("/api/machines"),
  },
 
  appointments: {
    list: () => request<Appointment[]>("/api/appointments"),
    slots: () => request<MachineWithSlots[]>("/api/appointments/slots"),
    book: (body: { machineId: number; startTime: string; endTime: string }) =>
      request<Appointment>("/api/appointments", { method: "POST", body: JSON.stringify(body) }),
    cancel: (id: number) =>
      request<Appointment>(`/api/appointments/${id}/cancel`, { method: "DELETE" }),
  },
}
 