import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { getDisplayName } from "@/features/auth/lib";
import { OrganizationSettingsTab } from "@/features/organization/components/organization-settings-tab";

export default async function SettingsPage() {
  // proxy.ts already guarantees a session before this page can render.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const name = getDisplayName(user);

  return (
    <>
      <PageHeader title="Settings" description="Manage your profile, organization, and preferences." />

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="organization">Organization</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardContent className="flex max-w-md flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" defaultValue={name} disabled />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" defaultValue={user?.email ?? ""} disabled />
              </div>
              <Button disabled className="self-start">
                Save changes
              </Button>
              <p className="text-xs text-muted-foreground">
                Editing isn&apos;t implemented yet — this will update your Supabase Auth profile
                once profile editing exists.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="organization">
          <OrganizationSettingsTab />
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Notification preferences (follow-up reminders, appointment alerts, AI
                recommendations) will be configurable here once the backend can deliver them.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
