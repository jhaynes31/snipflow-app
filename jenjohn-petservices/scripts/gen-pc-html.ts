import { buildPostCompletionHtml, buildPostCompletionBody } from "../src/lib/email";
const data: any = {
  clientName: "Annie W.",
  clientEmail: "jen.johnpetservices@proton.me",
  arrivalDate: "2026-08-20", arrivalTime: "10:00",
  departureDate: "2026-08-27", departureTime: "18:00",
  pets: { adultDogs: 2, puppies: 0, cats: 0, kittens: 0, otherSpecies: [] },
  isHoliday: false, totalPrice: 800,
  petDetails: [
    { name: "Bella", breed: "Labrador", age: "4", type: "adultDog", species: "" },
    { name: "Max", breed: "Golden Retriever", age: "6", type: "adultDog", species: "" },
  ],
  petNames: "Bella and Max",
};
await Bun.write("/tmp/pc-email.html", buildPostCompletionHtml(data));
await Bun.write("/tmp/pc-email.txt", buildPostCompletionBody(data));
console.log("HTML written /tmp/pc-email.html; QR refs:", (buildPostCompletionHtml(data).match(/payment-qr-/g)||[]).length, "| review links:", (buildPostCompletionHtml(data).match(/facebook.com|nextdoor.com|google.com\/maps/g)||[]).length);
