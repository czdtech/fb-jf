// Verification script to ensure all components can be imported
import { Button, buttonVariants } from "./button"
import { Card, CardContent, CardHeader, CardTitle } from "./card"
import { Badge, badgeVariants } from "./badge"

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
}

console.log('All shadcn/ui components verified:', componentsVerification)
