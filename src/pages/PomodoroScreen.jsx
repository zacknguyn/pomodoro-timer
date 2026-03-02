import SearchBar from "@/components/SearchBar"

const PomodoroScreen = () => {
  return (
    <div>
      <div className="p-4 flex border border-border rounded-lg shadow-gray-300 shadow-sm items-center justify-between">
        <h1 className="font-semibold text-2xl text-gray-900">Pomodoro</h1>

        <div>
          <SearchBar />
        </div>
      </div>
    </div>
  )
}

export default PomodoroScreen
