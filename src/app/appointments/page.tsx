"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { api, Appointment, MachineWithSlots } from "@/lib/api"

// Time slots: 7am to 10pm in 1-hour blocks
const HOUR_START = 7
const HOUR_END = 22

function buildSlots() {
  const slots = []
  for (let h = HOUR_START; h < HOUR_END; h++) {
    const label = `${h % 12 === 0 ? 12 : h % 12}:00 ${h < 12 ? "AM" : "PM"}`
    slots.push({ hour: h, label })
  }
  return slots
}

const TIME_SLOTS = buildSlots()

function isSlotBooked(machine: MachineWithSlots, hour: number): boolean {
  return machine.appointments.some((appt) => {
    const start = new Date(appt.startTime).getHours()
    const end = new Date(appt.endTime).getHours()
    return hour >= start && hour < end
  })
}

function isSlotPast(hour: number): boolean {
  return hour <= new Date().getHours()
}

export default function AppointmentsPage() {
  const router = useRouter()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [machines, setMachines] = useState<MachineWithSlots[]>([])
  const [selected, setSelected] = useState<{ machineId: number; hour: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState(false)
  const [filter, setFilter] = useState<"Today" | "All" | "BOOKED" | "COMPLETED" | "CANCELLED" | "EXPIRED">("Today")

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const filteredAppointments = appointments.filter((a) => {
    if (filter === "Today") {
      return new Date(a.startTime).toDateString() === new Date().toDateString()
    }
    if (filter === "All") return true
    return a.status === filter
  })

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      router.push("/login")
      return
    }
    Promise.all([api.appointments.list(), api.appointments.slots()])
      .then(([appts, mchs]) => {
        setAppointments(appts)
        setMachines(mchs)
        setLoading(false)
      })
      .catch(() => router.push("/login"))
  }, [router])

  async function handleBook() {
    if (!selected) return
    setError(null)
    setBooking(true)

    const today = new Date()
    const startTime = new Date(today)
    startTime.setHours(selected.hour, 0, 0, 0)
    const endTime = new Date(today)
    endTime.setHours(selected.hour + 1, 0, 0, 0)

    try {
      const newAppt = await api.appointments.book({
        machineId: selected.machineId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      })
      setAppointments((prev) => [newAppt, ...prev])
      // Mark the slot as booked in the grid
      setMachines((prev) =>
        prev.map((m) =>
          m.id === selected.machineId
            ? {
                ...m,
                appointments: [
                  ...m.appointments,
                  { id: newAppt.id, startTime: startTime.toISOString(), endTime: endTime.toISOString() },
                ],
              }
            : m
        )
      )
      setSelected(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Booking failed")
    } finally {
      setBooking(false)
    }
  }

  async function handleCancel(id: number) {
    try {
      const updated = await api.appointments.cancel(id)
      setAppointments((prev) => prev.map((a) => (a.id === id ? updated : a)))
      // Refresh slots so the grid updates
      const slots = await api.appointments.slots()
      setMachines(slots)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Cancel failed")
    }
  }

  function statusBadge(status: string) {
    const styles: Record<string, string> = {
      BOOKED: "bg-green-100 text-green-700",
      CANCELLED: "bg-red-100 text-red-600",
      COMPLETED: "bg-gray-100 text-gray-600",
    }
    return `text-xs font-medium px-2 py-0.5 rounded-full ${styles[status] ?? "bg-gray-100 text-gray-600"}`
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white shadow-sm px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-blue-600">Wash Wizard</h1>
        <Link href="/dashboard" className="text-sm text-gray-600 hover:text-blue-600">
          ← Dashboard
        </Link>
      </nav>

      <div className="max-w-4xl mx-auto p-6">

        {/* Slot grid */}
        <section className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-bold">Book a Slot</h2>
            <span className="text-sm text-gray-500">{today}</span>
          </div>
          <p className="text-xs text-gray-400 mb-5">
            Select an available slot below. Slots are 1 hour each.
          </p>

          {error && (
            <p className="text-red-600 text-sm mb-4 bg-red-50 p-3 rounded-lg">{error}</p>
          )}

          {loading ? (
            <p className="text-sm text-gray-400">Loading availability…</p>
          ) : (
            <>
              {/* Legend */}
              <div className="flex gap-4 mb-4 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-green-100 border border-green-300 inline-block" />
                  Available
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-red-100 border border-red-300 inline-block" />
                  Booked
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-gray-100 border border-gray-300 inline-block" />
                  Past
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-blue-500 inline-block" />
                  Selected
                </span>
              </div>

              {/* Grid */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      <th className="text-left py-2 pr-4 text-gray-500 font-medium w-24">Machine</th>
                      {TIME_SLOTS.map((s) => (
                        <th key={s.hour} className="text-center py-2 px-1 text-gray-500 font-medium min-w-[52px]">
                          {s.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {machines.map((machine) => (
                      <tr key={machine.id} className="border-t border-gray-100">
                        <td className="py-2 pr-4 font-medium text-gray-700">
                          M#{machine.machineNumber}
                          {machine.status === "OUT_OF_ORDER" && (
                            <span className="ml-1 text-red-400">(OUT OF ORDER)</span>
                          )}
                        </td>
                        {TIME_SLOTS.map((s) => {
                          const booked = isSlotBooked(machine, s.hour)
                          const past = isSlotPast(s.hour)
                          const outOfOrder = machine.status === "OUT_OF_ORDER"
                          const isSelected =
                            selected?.machineId === machine.id && selected?.hour === s.hour

                          let cellClass =
                            "mx-1 h-8 rounded cursor-pointer border text-center transition-colors "

                          if (isSelected) {
                            cellClass += "bg-blue-500 border-blue-600"
                          } else if (booked) {
                            cellClass += "bg-red-100 border-red-200 cursor-not-allowed"
                          } else if (past || outOfOrder) {
                            cellClass += "bg-gray-100 border-gray-200 cursor-not-allowed"
                          } else {
                            cellClass += "bg-green-100 border-green-300 hover:bg-green-200"
                          }

                          return (
                            <td key={s.hour} className="py-2 px-0.5">
                              <div
                                className={cellClass}
                                onClick={() => {
                                  if (!booked && !past && !outOfOrder) {
                                    setSelected(
                                      isSelected ? null : { machineId: machine.id, hour: s.hour }
                                    )
                                    setError(null)
                                  }
                                }}
                              />
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Confirm booking */}
              {selected && (
                <div className="mt-5 p-4 bg-blue-50 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-blue-800">
                      Machine #{machines.find((m) => m.id === selected.machineId)?.machineNumber}
                    </p>
                    <p className="text-xs text-blue-600 mt-0.5">
                      {TIME_SLOTS.find((s) => s.hour === selected.hour)?.label} –{" "}
                      {TIME_SLOTS.find((s) => s.hour === selected.hour + 1)?.label ??
                        "11:00 PM"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelected(null)}
                      className="text-xs px-3 py-1.5 rounded-lg border border-blue-300 text-blue-700 hover:bg-blue-100"
                    >
                      Clear
                    </button>
                    <button
                      onClick={handleBook}
                      disabled={booking}
                      className="text-xs px-4 py-1.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50"
                    >
                      {booking ? "Booking…" : "Confirm Booking"}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        {/* Appointments list */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">My Appointments</h2>
          <div className="flex gap-2">
            {(["Today", "All", "BOOKED", "COMPLETED", "CANCELLED", "EXPIRED"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                  filter === f
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-500 border hover:border-blue-400 hover:text-blue-600"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : filteredAppointments.length === 0 ? (
          <p className="text-sm text-gray-400">No appointments found.</p>
        ) : (
          filteredAppointments.map((a) => (
            <div
              key={a.id}
              className="bg-white rounded-xl shadow-sm p-4 mb-3 flex items-center justify-between"
            >
              <div>
                <p className="text-sm font-medium">Machine #{a.machine.machineNumber}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {new Date(a.startTime).toLocaleString()} →{" "}
                  {new Date(a.endTime).toLocaleString()}
                </p>
                <span className={statusBadge(a.status)}>{a.status}</span>
              </div>
              {a.status === "BOOKED" && (
                <button
                  onClick={() => handleCancel(a.id)}
                  className="text-xs text-red-500 hover:text-red-700 font-medium ml-4"
                >
                  Cancel
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </main>
  )
}