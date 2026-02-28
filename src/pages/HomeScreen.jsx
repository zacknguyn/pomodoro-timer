import { CgTimelapse } from "react-icons/cg";
import TodoList from "../components/TodoList"
import { RiWalkFill } from "react-icons/ri";

const HomeScreen = () => {
  return (
    <div className="flex flex-col justify-between h-full">
      <div className="p-4 flex flex-col gap-2">
        <div className="flex w-full justify-around">
          <div className="text-left ">
            <h3 className="font-semibold text-2xl uppercase">Good Morning</h3>
            <p className="text-gray-500 font-medium max-sm:w-40 sm:w-80">Here are your plan for today</p>
          </div>
          <div className="h-4 w-4 border rounded-full">
          </div>
        </div>

        <div className="flex gap-3 justify-start text-center items-center">
          <div className="flex flex-row gap-1 p-1 items-center">
            <RiWalkFill className="text-gray-400" />
            <p className="font-medium">5.2k</p>
          </div>
          <div className="flex flex-row gap-1 p-1 items-center">
            <CgTimelapse className="text-gray-400" />
            <p className="font-medium">7h 35m</p>
          </div>
        </div>
      </div>
      <div>

      </div>

    </div>
  )
}

export default HomeScreen
