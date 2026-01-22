import { FilterSpec } from "./types";

export const defaultAllViewFilterSpec: FilterSpec = {
    type: "group",
    operator: "and",
    filters: [
        {
            type: "property",
            propertyId: "statusId",
            propertyType: "status",
            operator: "status_is",
            value: "" // فاضي => ignored
        },
        {
            type: "property",
            propertyId: "nameInPassport",
            propertyType: "text",
            operator: "string_contains",
            value: "" // فاضي => ignored
        },
        {
            type: "property",
            propertyId: "mobileNumber",
            propertyType: "phone_number",
            operator: "string_contains",
            value: "" // فاضي => ignored
        },
        {
            type: "property",
            propertyId: "biometricsDate",
            propertyType: "date",
            operator: "date_is",
            value: "" // فاضي => ignored
        }
    ]
};
