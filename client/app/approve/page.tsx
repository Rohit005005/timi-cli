"use client";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { LoaderCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const DeviceApprovalPage = () => {
  const { data, isPending } = authClient.useSession();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState({
    approve: false,
    deny: false,
  });
  const searchParams = useSearchParams();
  const userCode = searchParams.get("user_code");

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

  const handleApprove = async () => {
    setIsProcessing({
      approve: true,
      deny: false,
    });

    try {
      const { error } = await authClient.device.approve({
        userCode: userCode!,
      });
      if (error) {
        console.log("Failed to approve device: ", error);
        setIsProcessing({
          approve: false,
          deny: false,
        });
        return;
      }
      console.log("Device approved successfully !!");
      router.push("/");
    } catch (error) {
      console.log("Failed to approve device", error);
    } finally {
      setIsProcessing({
        approve: false,
        deny: false,
      });
    }
  };

  const handleDeny = async () => {
    setIsProcessing({
      approve: false,
      deny: true,
    });

    try {
      const { error } = await authClient.device.deny({
        userCode: userCode!,
      });

      if (error) {
        console.log("Failed to deny device: ", error);
        setIsProcessing({
          approve: false,
          deny: false,
        });
        return;
      }

      console.log("Device denied successfully !!");
      router.push("/");
    } catch (error) {
      console.log("Failed to deny device", error);
    } finally {
      setIsProcessing({
        approve: false,
        deny: false,
      });
    }
  };

  return (
    <div className="flex flex-col justify-center items-center h-screen gap-4">
      <p className="text-3xl text-white">Your user code</p>
      <p className="text-2xl text-white w-fit px-10 py-5 rounded-xl bg-black">
        {userCode}
      </p>

      <Button className="w-64 text-xl p-5 bg-green-600" onClick={handleApprove}>
        {isProcessing.approve ? (
          <LoaderCircle className="animate-spin" />
        ) : (
          "Approve"
        )}
      </Button>
      <Button
        className="w-64 text-xl p-5"
        variant={"destructive"}
        onClick={handleDeny}
      >
        {isProcessing.deny ? <LoaderCircle className="animate-spin" /> : "Deny"}
      </Button>
    </div>
  );
};

export default DeviceApprovalPage;
