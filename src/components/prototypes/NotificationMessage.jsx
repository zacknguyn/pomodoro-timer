import { ChevronRight, ShieldAlertIcon } from "lucide-react";
import { Button } from "../ui/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "../ui/item";

const RandomNotifications = [
  {
    title: "You missed your morning coffee break.",
    description: "A simple item with title and description.",
  },
  {
    title: "Your afternoon walk was canceled due to rain.",
    description: "A simple item with title and description.",
  },
  {
    title: "You forgot to water your plants.",
    description: "A simple item with title and description.",
  },
  {
    title: "Your daily meditation session was interrupted by a phone call.",
    description: "A simple item with title and description.",
  },
  {
    title: "You missed your evening workout.",
    description: "A simple item with title and description.",
  },
  {
    title: "Your favorite TV show was on a different channel.",
    description: "A simple item with title and description.",
  },
  {
    title: "You forgot to take your medication.",
    description: "A simple item with title and description.",
  },
  {
    title: "Your flight was delayed due to weather.",
    description: "A simple item with title and description.",
  },
  {
    title: "You missed your train because of a platform change.",
    description: "A simple item with title and description.",
  },
  {
    title: "Your car broke down on the way to work.",
    description: "A simple item with title and description.",
  },
];

const NotificationMessage = ({ ...props }) => {
  return (
    <Item variant="outline">
      <ItemMedia variant="icon">
        <ShieldAlertIcon />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>{RandomNotifications[props.id].title}</ItemTitle>
        <ItemDescription>
          {RandomNotifications[props.id].description}
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <Button size="sm" variant="outline">
          Review
        </Button>
      </ItemActions>
    </Item>
  );
};

export default NotificationMessage;
