import { InputGroup, InputGroupInput, InputGroupAddon } from "./ui/input-group"
import { Search } from "lucide-react"
import { Kbd } from "./ui/kbd"

const SearchBar = () => {
  return (
    <div>
      <InputGroup className="max-w-sm">
        <InputGroupInput placeholder="Search..." />
        <InputGroupAddon>
          <Search className="text-muted-foreground" />
        </InputGroupAddon>
        <InputGroupAddon align="inline-end">
          <Kbd>⏎</Kbd>
        </InputGroupAddon>
      </InputGroup>
    </div>
  )
}

export default SearchBar
