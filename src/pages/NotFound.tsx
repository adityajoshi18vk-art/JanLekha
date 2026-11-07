import { PublicLayout } from "../components/Layout";
import { PageHeader, EmptyState } from "../components/ui";
export default function Page() {
  return <PublicLayout>
    <PageHeader title={"Page not found"} subtitle={"Not found. This page is being built by the JanLekha team."} />
    <EmptyState title="Coming soon in this build" body="This page is part of the JanLekha 2.0 build. Use the navigation to explore the pages that are ready." link="/" linkLabel="Back to home" />
  </PublicLayout>;
}
