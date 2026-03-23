"use client"
import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { api, Appointment, Notification } from "@/lib/api"

const POLL_INTERVAL_MS = process.env.NODE_ENV === "development" ? 5 * 1000 : 30 * 1000

function formatCountdown(ms: number): string {
  if (ms <= 0) return "00:00"
  const totalSeconds = Math.floor(ms / 1000)
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
}

function getActiveAppointments(appointments: Appointment[]): Appointment[] {
  const now = new Date()
  return appointments.filter((a) => {
    if (["PENDING_START", "IN_USE"].includes(a.status)) return true
    if (a.status === "BOOKED" && new Date(a.startTime) <= now) return true
    return false
  })
}

// Per-appointment tracker card with its own countdown
function AppointmentTracker({
  appointment,
  onStatusUpdate,
  onStart,
}: {
  appointment: Appointment
  onStatusUpdate: (updated: Appointment) => void
  onStart: (id: number) => void
}) {
  const [countdown, setCountdown] = useState("--:--")

  // Poll this appointment's status
  useEffect(() => {
    if (["COMPLETED", "EXPIRED", "CANCELLED"].includes(appointment.status)) return
    const poll = async () => {
      try {
        const updated = await api.appointments.status(appointment.id)
        onStatusUpdate(updated)
      } catch (_) {}
    }
    // Immediate poll if BOOKED and past start time
    if (appointment.status === "BOOKED") poll()
    const interval = setInterval(poll, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [appointment.id, appointment.status, onStatusUpdate])

  // Countdown tick
  useEffect(() => {
    const tick = () => {
      const now = Date.now()
      if (appointment.status === "BOOKED") {
        setCountdown("--:--")
      } else if (appointment.status === "PENDING_START") {
        const graceDeadline = new Date(appointment.startTime).getTime() + 60 * 1000
        setCountdown(formatCountdown(graceDeadline - now))
      } else if (appointment.status === "IN_USE") {
        setCountdown(formatCountdown(new Date(appointment.endTime).getTime() - now))
      }
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [appointment])

  const bgColor =
    appointment.status === "IN_USE"
      ? "bg-blue-600"
      : appointment.status === "PENDING_START"
      ? "bg-orange-500"
      : "bg-gray-500"

  const statusLabel =
    appointment.status === "PENDING_START"
      ? "Waiting to Start"
      : appointment.status === "IN_USE"
      ? "In Progress"
      : "Starting soon…"

  return (
    <div className={`rounded-xl p-6 text-white mb-4 ${bgColor}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm opacity-80">Machine #{appointment.machine.machineNumber}</p>
          <p className="text-xs opacity-70 mt-0.5">
            {new Date(appointment.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            {" → "}
            {new Date(appointment.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <span className="text-xs bg-white bg-opacity-20 px-3 py-1 rounded-full font-medium">
          {statusLabel}
        </span>
      </div>

      <div className="text-center my-4">
        <p className="text-5xl font-bold font-mono tracking-widest">{countdown}</p>
        <p className="text-xs opacity-70 mt-2">
          {appointment.status === "PENDING_START"
            ? "Time remaining to load laundry"
            : appointment.status === "IN_USE"
            ? "Time remaining in your slot"
            : "Waiting to begin…"}
        </p>
      </div>

      {appointment.status === "PENDING_START" && (
        <button
          onClick={() => onStart(appointment.id)}
          className="w-full mt-2 bg-white text-orange-600 font-bold py-3 rounded-lg hover:bg-orange-50 transition-colors"
        >
          Start Laundry
        </button>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      router.push("/login")
      return
    }
    Promise.all([api.appointments.list(), api.notifications.list()])
      .then(([appts, notifs]) => {
        setAppointments(appts)
        setNotifications(notifs)
        setLoading(false)
      })
      .catch(() => router.push("/login"))
  }, [router])

  const handleStatusUpdate = useCallback((updated: Appointment) => {
    setAppointments((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
    if (["COMPLETED", "EXPIRED"].includes(updated.status)) {
      api.notifications.list().then(setNotifications).catch(() => {})
    }
  }, [])

  async function handleStart(id: number) {
    try {
      const updated = await api.appointments.start(id)
      setAppointments((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to start")
    }
  }

  async function handleDismissNotifications() {
    await api.notifications.markAllRead()
    setNotifications([])
  }

  function handleLogout() {
    localStorage.removeItem("token")
    router.push("/login")
  }

  const activeAppointments = getActiveAppointments(appointments)
  const upcoming = appointments.filter(
    (a) => a.status === "BOOKED" && new Date(a.startTime) > new Date()
  )

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-blue-600">Wash Wizard</h1>
        <div className="flex items-center gap-4">
          <Link href="/appointments" className="text-sm text-gray-600 hover:text-blue-600">
            Appointments
          </Link>
          <button onClick={handleLogout} className="text-sm text-red-500 hover:text-red-700">
            Logout
          </button>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto p-6">

        {/* Notifications */}
        {notifications.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 flex items-start justify-between">
            <div>
              {notifications.map((n) => (
                <p key={n.id} className="text-sm text-yellow-800 font-medium">{n.message}</p>
              ))}
            </div>
            <button
              onClick={handleDismissNotifications}
              className="text-xs text-yellow-600 hover:text-yellow-800 ml-4 shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        <h2 className="text-xl font-bold mb-6">Dashboard</h2>

        {/* Active appointment trackers */}
        {activeAppointments.length > 0 && (
          <section className="mb-8">
            <h3 className="font-semibold text-gray-700 mb-3">
              Active {activeAppointments.length > 1 ? "Appointments" : "Appointment"}
            </h3>
            {activeAppointments.map((appt) => (
              <AppointmentTracker
                key={appt.id}
                appointment={appt}
                onStatusUpdate={handleStatusUpdate}
                onStart={handleStart}
              />
            ))}
          </section>
        )}

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <Link
            href="/appointments"
            className="bg-blue-600 text-white rounded-xl p-5 hover:bg-blue-700 transition-colors"
          >
            <p className="text-lg mb-1">📅</p>
            <p className="font-semibold text-sm">Book Appointment</p>
            <p className="text-xs opacity-80 mt-1">Reserve a machine</p>
          </Link>
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <p className="text-lg mb-1">🔄</p>
            <p className="font-semibold text-sm">Upcoming</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{upcoming.length}</p>
          </div>
        </div>

        {/* Upcoming appointments */}
        {!loading && upcoming.length > 0 && (
          <>
            <h3 className="font-semibold text-gray-700 mb-3">Upcoming Appointments</h3>
            {upcoming.map((a) => (
              <div key={a.id} className="bg-white rounded-xl shadow-sm p-4 mb-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm">Machine #{a.machine.machineNumber}</p>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                    {a.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(a.startTime).toLocaleString()} → {new Date(a.endTime).toLocaleString()}
                </p>
              </div>
            ))}
          </>
        )}
      </div>
    </main>
  )
}
