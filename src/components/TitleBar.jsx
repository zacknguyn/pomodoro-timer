import AvatarIcon from "./AvatarIcon";
import NotificationsButton from "./NotificationsButton";
import SearchBar from "./SearchBar";

const TitleBar = ({ ...props }) => {
  return (
    <div className="p-4 flex border border-border rounded-lg shadow-gray-300 shadow-sm items-center justify-between">
      <h1 className="font-semibold text-2xl text-gray-900">{props.title}</h1>
      <div className="flex items-center gap-2">
        <SearchBar />

        <NotificationsButton />

        <AvatarIcon />
      </div>
    </div>
  );
};

export default TitleBar;
