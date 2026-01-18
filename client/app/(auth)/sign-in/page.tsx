"use client";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { Github, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const Page = () => {
  const { data, isPending } = authClient.useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isPending) {
      if (data?.session) {
        router.push("/");
      }
    }
  }, [data, isPending, router]);

  if (isPending) {
    return (
      <div className="flex flex-col h-screen justify-center items-center">
        <LoaderCircle className="size-10 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <p className="text-2xl font-bold">Welcome to TIMI CLI</p>
      <p className="text-white/60 text-lg">
        Sign in to establish a secure session with your terminal
      </p>
      <Button
        className="gap-2 border-2 border-gray-600 rounded-lg cursor-pointer my-5"
        onClick={async () => {
          setLoading(true);
          await authClient.signIn.social({
            provider: "github",
            callbackURL: process.env.NEXT_PUBLIC_FRONTEND_URL,
          });
          setLoading(false);
        }}
      >
        {loading ? (
          <LoaderCircle className="size-5 animate-spin text-white" />
        ) : (
          <>
            <Github className="size-5" />
            <p className="text-lg">Continue with Github</p>
          </>
        )}
      </Button>
      <p className="text-yellow-400 border border-yellow-700 rounded-lg text-sm px-2 py-1">
        Next step: You will be asked to verify your device code
      </p>
    </div>
  );
};

export default Page;
