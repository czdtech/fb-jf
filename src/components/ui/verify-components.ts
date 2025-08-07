// Verification script to ensure all components can be imported
import { Button, buttonVariants } from "./button"
import { Card, CardContent, CardHeader, CardTitle } from "./card"
import { Badge, badgeVariants } from "./badge"
import { 
  NavigationMenu, 
  NavigationMenuList, 
  NavigationMenuItem,
  NavigationMenuTrigger,
  NavigationMenuContent,
  NavigationMenuLink
} from "./navigation-menu"
import { 
  Sheet, 
  SheetTrigger, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetDescription
} from "./sheet"

// Export verification object
export const componentsVerification = {
  Button: !!Button,
  buttonVariants: !!buttonVariants,
  Card: !!Card,
  CardContent: !!CardContent,
  CardHeader: !!CardHeader,
  CardTitle: !!CardTitle,
  Badge: !!Badge,
  badgeVariants: !!badgeVariants,
  NavigationMenu: !!NavigationMenu,
  NavigationMenuList: !!NavigationMenuList,
  NavigationMenuItem: !!NavigationMenuItem,
  NavigationMenuTrigger: !!NavigationMenuTrigger,
  NavigationMenuContent: !!NavigationMenuContent,
  NavigationMenuLink: !!NavigationMenuLink,
  Sheet: !!Sheet,
  SheetTrigger: !!SheetTrigger,
  SheetContent: !!SheetContent,
  SheetHeader: !!SheetHeader,
  SheetTitle: !!SheetTitle,
  SheetDescription: !!SheetDescription,
}

console.log('All shadcn/ui components verified:', componentsVerification)