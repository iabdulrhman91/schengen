
import { JsonStorage } from "@/lib/storage/json-adapter";
import { PriceOverride } from "@/lib/storage/types";

export const dynamic = 'force-dynamic';

export default async function TestPricingPage() {
    const storage = new JsonStorage();
    const logs: string[] = [];
    const log = (msg: string) => logs.push(msg);

    // TARGET DATA FROM DB.JSON
    const TARGET_COUNTRY_ID = "ey2zd5b"; // Spain
    const TARGET_APPT_ID = "0405033";   // Appointment in Khamis Mushait

    try {
        log("--- START PRICING TEST (v2) ---");

        // 1. Ensure PriceBook Exists
        let priceBooks = await storage.getPriceBooks(TARGET_COUNTRY_ID);
        log(`Found ${priceBooks.length} PriceBooks for Spain (${TARGET_COUNTRY_ID}).`);

        if (priceBooks.length === 0) {
            log("Creating DEFAULT PriceBook for Spain...");
            await storage.createPriceBook({
                countryId: TARGET_COUNTRY_ID,
                name: "Spain Base 2026 (Auto-Created)",
                currency: "SAR",
                is_active: true,
                is_default_for_country: true,
                normal_adult_price: 450,
                normal_child_price: 350,
                normal_infant_price: 150,
                vip_adult_price: 850,
                vip_child_price: 750,
                vip_infant_price: 250
            });
            log("PriceBook Created.");
            // Re-fetch
            priceBooks = await storage.getPriceBooks(TARGET_COUNTRY_ID);
        }

        const appt = await storage.getAppointment(TARGET_APPT_ID);
        if (!appt) throw new Error(`Appt ${TARGET_APPT_ID} not found`);
        log(`Target Appointment: ${appt.id} (Location: ${appt.locationId})`);

        // --- TEST 1: Base Price Only ---
        log("\n>>> TEST 1: BASE PRICE ONLY");
        const res1 = await storage.resolveUnitPrices(appt.id);
        log(`Normal: Adult=${res1.normal.adult}, Child=${res1.normal.child}, Infant=${res1.normal.infant}`);
        log(`VIP:    Adult=${res1.vip.adult}, Child=${res1.vip.child}, Infant=${res1.vip.infant}`);

        // --- TEST 2: City Override (10%) ---
        log("\n>>> TEST 2: CITY OVERRIDE (10% Discount on Normal Adult)");
        const cityOverride = await storage.createPriceOverride({
            scope: 'CITY',
            countryId: appt.countryId,
            locationId: appt.locationId,
            modifierType: 'DISCOUNT_PERCENT',
            value: 10,
            seatType: 'NORMAL',
            passengerType: 'ADULT',
            is_active: true
        });
        log(`Created City Override: ${cityOverride.id}`);

        const res2 = await storage.resolveUnitPrices(appt.id);
        log(`Result Normal Adult: ${res2.normal.adult} (Expected: 450 - 10% = 405)`);

        // --- TEST 3: Appointment Override (50 SAR) ---
        log("\n>>> TEST 3: APPOINTMENT OVERRIDE (50 SAR Discount on Normal Adult)");
        const apptOverride = await storage.createPriceOverride({
            scope: 'APPOINTMENT',
            countryId: appt.countryId,
            appointmentId: appt.id,
            modifierType: 'DISCOUNT_AMOUNT',
            value: 50,
            seatType: 'NORMAL',
            passengerType: 'ADULT',
            is_active: true
        });
        log(`Created Appt Override: ${apptOverride.id}`);

        const res3 = await storage.resolveUnitPrices(appt.id);
        log(`Result Normal Adult: ${res3.normal.adult} (Expected: 405 - 50 = 355)`);
        log(`Applied Overrides: ${JSON.stringify(res3.appliedOverrideIds)}`);

        // CLEANUP
        log("\n>>> CLEANUP");
        await storage.updatePriceOverride(cityOverride.id, { is_active: false });
        await storage.updatePriceOverride(apptOverride.id, { is_active: false });
        log("Overrides deactivated.");

    } catch (e: any) {
        log(`ERROR: ${e.message}`);
        console.error(e);
    }

    return (
        <div className="p-8 font-mono text-sm whitespace-pre-wrap bg-gray-50 min-h-screen">
            {logs.join('\n')}
        </div>
    );
}
