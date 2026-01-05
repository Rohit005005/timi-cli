"use client";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { Github, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const Page = () => {
  const { data, isPending } = authClient.useSession();
  const router = useRouter();

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
    <div>
      <p className="text-center text-2xl my-5">Welcome to AI CLI !!</p>
      <Button
        className="gap-2 border-2 border-gray-600 rounded-lg cursor-pointer"
        onClick={async () => {
          await authClient.signIn.social({
            provider: "github",
            callbackURL: "http://localhost:3000",
          });
        }}
      >
        <Github className="size-5" />
        <p className="text-lg">Continue with Github</p>
      </Button>
    </div>
  );
};

export default Page;
