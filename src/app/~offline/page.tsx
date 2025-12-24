import { Dices, WifiOff } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function OfflinePage() {
  return (
    <main className="min-h-[100dvh] flex flex-col items-center justify-center p-4 sm:p-8">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Dices className="w-10 h-10 sm:w-12 sm:h-12 text-accent" />
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-accent via-primary to-secondary bg-clip-text text-transparent">
            KnuckleTrainer
          </h1>
        </div>
      </div>

      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-4 rounded-full bg-muted">
            <WifiOff className="w-8 h-8 text-muted-foreground" />
          </div>
          <CardTitle>You're Offline</CardTitle>
          <CardDescription>
            It looks like you've lost your internet connection.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            Don't worry! Once you're back online, you can continue playing. The
            VS AI mode works offline after your first visit.
          </p>

          <Link href="/" className="block">
            <Button className="w-full">Try Again</Button>
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
