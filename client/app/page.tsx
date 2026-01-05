"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";
import { LoaderCircle } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { data, isPending } = authClient.useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isPending) {
      if (!data?.session || !data.user) {
        router.push("/sign-in");
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
    <div className="flex flex-col h-screen justify-center items-center">
      <Card className="bg-black w-125 border-2 border-gray-600">
        <CardContent className="flex flex-col justify-center items-center">
          {data?.user.image && (
            <Image
              src={data?.user.image}
              alt="user-image"
              className=" rounded-full"
              width={100}
              height={100}
            />
          )}

          <p className="text-white text-2xl">Welcome {data?.user.name}</p>

          <p className=" text-gray-600 text-sm my-5">Authenticated User</p>

          <div>
            <p className="text-white">Email address</p>
            <p className=" text-gray-600 text-sm">{data?.user.email}</p>
          </div>

          <Button
            variant={"destructive"}
            className="cursor-pointer mt-10 w-[60%]"
            onClick={async () => {
              await authClient.signOut({
                fetchOptions: {
                  onSuccess: () => {
                    router.push("/sign-in");
                  },
                },
              });
            }}
          >
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
