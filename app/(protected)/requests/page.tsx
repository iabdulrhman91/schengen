import { getMyCases, getSession } from "@/lib/actions";
import { storage } from "@/lib/storage";
import { Button } from "@/components/ui/core";
import Link from "next/link";
import { OperationalSheet } from "@/components/OperationalSheet";

export default async function CasesPage() {
    const cases = await getMyCases();
    const countries = await storage.getCountries();
    const appointments = await storage.getAppointments();
    const locations = await storage.getLocations();
    const agencies = await storage.getAgencies();

    return (
        <div className="h-full flex flex-col">
            <OperationalSheet
                cases={cases}
                countries={countries}
                appointments={appointments}
                locations={locations}
                agencies={agencies}
            />
        </div>
    );
}
