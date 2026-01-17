const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="h-screen flex flex-col justify-center items-center text-white">
      {children}
    </div>
  );
};

export default AuthLayout;
