import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-4xl font-bold">BQR</h1>
        <p className="text-muted-foreground">Mosaic QR Code Generator</p>
        <Button>Generate QR</Button>
      </div>
    </main>
  );
}
