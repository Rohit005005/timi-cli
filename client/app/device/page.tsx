"use client";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { LoaderCircle, ShieldUser } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const DeviceAuthorizationPage = () => {
  const [userCode, setUserCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isDisabled = userCode.trim().length === 0;

  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError(null);
    setLoading(true);

    try {
      const formattedCode = userCode.trim().replace(/-/g, "").toUpperCase();

      const response = await authClient.device({
        query: { user_code: formattedCode },
      });

      if (response.data) {
        router.push(`/approve?user_code=${formattedCode}`);
      }
    } catch (error) {
      setError("Invalid or Expired code !!");
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col justify-center items-center h-screen gap-4">
      <ShieldUser className="text-white size-20" strokeWidth={1} />
      <p className="text-white text-3xl">Device Authorization</p>
      <p className="text-white/45 text-lg">
        Enter your device code to continue
      </p>

      <form
        className="flex flex-col justify-center items-center gap-4 rounded-xl p-5 bg-black"
        onSubmit={handleSubmit}
      >
        <label className="text-white text-2xl">Enter Code</label>
        <input
          className=" text-center text-white text-2xl bg-[#333333] rounded-lg p-2"
          type="text"
          placeholder="******"
          maxLength={9}
          onChange={(e) => {
            setUserCode(e.target.value);
          }}
        />

        <Button
          type="submit"
          className="w-full text-lg text-black bg-white hover:bg-white/90 hover:text-xl"
          disabled={isDisabled}
        >
          {loading ? <LoaderCircle className="animate-spin" /> : "Submit"}
        </Button>
      </form>
    </div>
  );
};

export default DeviceAuthorizationPage;
