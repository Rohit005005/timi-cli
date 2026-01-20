"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";
import { ArrowRight, LoaderCircle, UserRoundCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Home() {
  const { data, isPending } = authClient.useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

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
        <CardContent className="flex flex-col justify-center items-center gap-4">
          {data?.user.image && (
            <Image
              src={data?.user.image}
              alt="user-image"
              className=" rounded-full"
              width={100}
              height={100}
            />
          )}

          <p className="text-white font-bold text-2xl">
            Welcome {data?.user.name}
          </p>
          <p className=" text-white/60 text-sm">{data?.user.email}</p>

          <p className="text-white text-md flex gap-2">
            <UserRoundCheck className="text-white" size={20} />
            Authenticated User
          </p>

          <Button
            variant={"destructive"}
            className="cursor-pointer w-[60%]"
            onClick={async () => {
              setLoading(true);
              await authClient.signOut({
                fetchOptions: {
                  onSuccess: () => {
                    router.push("/sign-in");
                  },
                },
              });
              setLoading(false);
            }}
          >
            {loading ? (
              <LoaderCircle className="size-5 animate-spin text-white" />
            ) : (
              <p>Sign Out</p>
            )}
          </Button>
        </CardContent>
      </Card>
      <Link href="/device" className="flex items-center text-sm border-b my-2">
        Verfy device code{" "}
        <ArrowRight size={18} strokeWidth={1.5} className="text-white" />
      </Link>
    </div>
  );
}
