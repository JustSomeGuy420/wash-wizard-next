"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { api, Appointment, User } from "@/lib/api"

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      router.push("/login")
      return
    }
    api.appointments
      .list()
      .then((appts) => {
        setAppointments(appts)
        setLoading(false)
      })
      .catch(() => router.push("/login"))
  }, [router])

  function handleLogout() {
    localStorage.removeItem("token")
    router.push("/login")
  }

  const upcoming = appointments.filter(
    (a) => a.status === "BOOKED" && new Date(a.startTime) > new Date()
  )

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white shadow-sm px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-blue-600">Wash Wizard</h1>
        <div className="flex items-center gap-4">
          <Link href="/appointments" className="text-sm text-gray-600 hover:text-blue-600">
            Appointments
          </Link>
          <button
            onClick={handleLogout}
            className="text-sm text-red-500 hover:text-red-700"
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto p-6">
        <h2 className="text-xl font-bold mb-1">Dashboard</h2>
        <p className="text-sm text-gray-500 mb-6">Welcome back!</p>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <Link
            href="/appointments"
            className="bg-blue-600 text-white rounded-xl p-5 hover:bg-blue-700 transition-colors"
          >
            <p className="text-lg font-bold mb-1">📅</p>
            <p className="font-semibold text-sm">Book Appointment</p>
            <p className="text-xs opacity-80 mt-1">Reserve a machine</p>
          </Link>
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <p className="text-lg font-bold mb-1">🔄</p>
            <p className="font-semibold text-sm">Upcoming</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{upcoming.length}</p>
          </div>
        </div>

        {/* Upcoming appointments */}
        <h3 className="font-semibold text-gray-700 mb-3">Upcoming Appointments</h3>
        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : upcoming.length === 0 ? (
          <div className="bg-white rounded-xl p-6 shadow-sm text-center">
            <p className="text-gray-400 text-sm">No upcoming appointments.</p>
            <Link href="/appointments" className="text-blue-600 text-sm hover:underline mt-2 inline-block">
              Book one now →
            </Link>
          </div>
        ) : (
          upcoming.map((a) => (
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
          ))
        )}
      </div>
    </main>
  )
}
