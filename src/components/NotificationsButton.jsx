import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Bell } from "lucide-react";
import NotificationMessage from "./prototypes/NotificationMessage";

const NotificationsButton = () => {
  return (
    <Drawer direction="right">
      <DrawerTrigger asChild>
        <Button
          variant="outline"
          className="border-0 transition-colors duration-500 hover:bg-gray-200"
        >
          <Bell />
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Notifications</DrawerTitle>
          <DrawerDescription>
            Here's what have you missed during your timeoff.
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-4 no-scrollbar overflow-y-auto px-4">
          {Array.from({ length: 10 }).map((_, index) => (
            <NotificationMessage key={index} id={index} />
          ))}
        </div>
        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="">Close</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

export default NotificationsButton;
