"use client";

import { Menu } from "@/components/Menu";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { login, signup } from "./actions";

export default function LoginPage() {
  if (process.env.NEXT_PUBLIC_PROFILE_ACTIVE !== "true") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Card className="m-4 p-8 text-center">
          <h2 className="text-2xl font-bold mb-2">Login deaktiviert</h2>
          <p className="text-gray-500">
            Die Login-Funktion ist aktuell deaktiviert.
          </p>
        </Card>
      </div>
    );
  }
  return (
    <div className={`flex flex-col`}>
      <PageHeader backHref="/" title="Würfelkarte" right={<Menu />} />
      {/* Login Card */}
      <div className="flex flex-1 items-center justify-center">
        <Card className={`p-6 w-full max-w-md flex flex-col shadow-lg mx-4`}>
          <h2 className="text-2xl font-bold mb-2 text-center">Login</h2>
          <form className="flex flex-col gap-4">
            <label htmlFor="email" className="font-medium">
              Email
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
            />
            <label htmlFor="password" className="font-medium">
              Passwort
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
            <div className="flex flex-col gap-2 mt-4">
              <Button
                type="submit"
                formAction={login}
                className="w-full"
                variant="default"
              >
                Log in
              </Button>
              <Button
                type="submit"
                formAction={signup}
                variant="outline"
                className="w-full"
              >
                Sign up
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
