import { createServerFn } from "@tanstack/react-start";

/**
 * API route: POST /api/seed-reviews
 * Seeds the reviews table with all 22 testimonials via the Convex HTTP API.
 * Requires CONVEX_DEPLOYMENT_URL to be set.
 */
export const seedReviewsAction = createServerFn({ method: "POST" }).handler(
  async () => {
    const deploymentUrl = process.env.CONVEX_DEPLOYMENT_URL;
    if (!deploymentUrl) {
      return {
        success: false,
        error:
          "Convex not configured. Set CONVEX_DEPLOYMENT_URL environment variable.",
      };
    }

    const reviews = [
      {
        name: "Annie W.",
        date: "July 19, 2026",
        quote:
          "Jennifer and John were wonderful sitters! They were very communicative and sent us photos daily. I could tell our dogs were happy and comfortable in the photos. We were able to enjoy our vacation with peace of mind. We also came home to a very clean house! I would recommend them to anyone and will definitely have them watch our dogs again!",
      },
      {
        name: "Olivia P.",
        date: "July 5, 2026",
        quote:
          "I was worried about leaving our dog Finn for the week since we normally don't leave him, however, Jen and John took such amazing care of him and were in constant communication that I had no worries while I was away. They also left the house in perfect condition. I can't recommend them enough.",
      },
      {
        name: "Carroll I.",
        date: "June 16, 2026",
        quote:
          "Jennifer and John did an amazing job watching our dog. They send me many pictures and updates. We came back to a joyful dog and a clean house. Definitely would recommend!",
      },
      {
        name: "Judy S.",
        date: "June 12, 2026",
        quote:
          "Jennifer watched our 3 dogs during a weekend away and I couldn't have asked for a better dogsitter. She sent pics throughout the weekend and we could tell our dogs were getting all the love we give them!! Thank you.",
      },
      {
        name: "Carly M.",
        date: "May 10, 2026",
        quote:
          "Jennifer & John did a phenomenal job!! Couldn't recommend enough!!",
      },
      {
        name: "Ellen H.",
        date: "April 12, 2026",
        quote:
          "Jennifer and John took great care of our babies. They gave us updates and pictures throughout their stay. We were very hesitant to have strangers in our home but they took care of our home as if it were theirs, and we came home to a cleaner house than we left. Highly recommend and would definitely use again. Our babies were happy, healthy and loved while in their care and that was the most important thing for us.",
      },
      {
        name: "Jack C.",
        date: "January 16, 2026",
        quote:
          "Jen and John were great! They were patient and took amazing care of my cat while I was gone.",
      },
      {
        name: "Christina H.",
        date: "December 30, 2025",
        quote:
          "Jen and John were amazing! We had an initial call to explain the care for our two pups and it was immediately clear how much they love animals and how much care they would give to the house. They gave us an update every day and clearly spent a lot of time with the boys. At the end of the trip, they gave us a thorough status of the house, and went above and beyond to leave the house clean and cared for. We will definitely be booking them again!",
      },
      {
        name: "Courtney W.",
        date: "November 29, 2025",
        quote:
          "Jen and John were great! They were very professional and had excellent communication with us and took fabulous care of our dog and our home while we were gone! We felt very comfortable leaving Izzy in their care! They sent regular pictures, and we could tell Izzy loved them! And the house was spotless when we returned, with dishes and linens all washed! We would definitely recommend them and we look forward to having them stay with Izzy again next time we go away!",
      },
      {
        name: "Jan J.",
        date: "October 31, 2025",
        quote:
          "WOW (and then some!) If we could give 10 stars, we would! Jen and John are absolutely paws-itively amazing! They took care of our fur babies (and our home!) while we were away for a wedding, and we couldn't have asked for a better duo. Warm, caring, and totally professional -- they were on time, super responsive to texts, and sent us daily photo updates that made us smile every time. And the best part? We came home to happy, spoiled and worn out pups, as well as a spotless house -- they even washed our sheets and made the bed so we could just relax after traveling. Who does that?! We can't recommend Jen and John enough -- our pups (and we!) can't wait to have them back again!",
      },
      {
        name: "Jess S.",
        date: "August 21, 2025",
        quote:
          "Jen and Jon did a fantastic job watching my dogs and cat. This was a last minute request and they didn't hesitate to help us out. One of our dogs has some health issues and they managed his pain and medications and made him comfortable while we were away. My babies were relaxed and happy after our trip out of town. I would highly recommend them to anyone who needs pet sitting.",
      },
      {
        name: "Libby Z.",
        date: "May 26, 2025",
        quote:
          "We really appreciate Jennifer (and John) for taking care of our kitten. They were very thorough and gave updates along with photos. They were able to watch Cali with little time notice. They made sure Cali was played with, cuddled and cleaned up nicely when we got back.",
      },
      {
        name: "Michelle S.",
        date: "December 30, 2024",
        quote:
          "Jennifer and John were such a blessing, on a seriously last minute booking! They were so responsive, made time in the less than 24 hour notice request to come over to meet our dogs. They were thorough in explaining the care they provide and very personable! As I was so nervous letting people I'd never met stay in our home they were reassuring and attentive to my multiple questions. While away, they sent many updates and pictures, again so reassuring to me! They also are so neat and tidy and took such good care of our home cleaning up after themselves, the dogs as well as washing the linens! Would absolutely recommend!! Thank you Jennifer and John!",
      },
      {
        name: "Amber P.",
        date: "December 2, 2024",
        quote:
          "Jen and John were AMAZING! We're so lucky we found them. So professional & communicative from the get go. We had such peace of mind while we were out of town knowing they were taking care of our pups. They sent us updates daily, were very responsive when we messaged and they took such great care of the dogs, even our old lady Betsey, who is a lot of work. They stayed at our house for the week and also took such great care of our home. They even took out our trash, brought in our mail and cleaned & washed the bed linen before we arrived back home. Would 100% book with them again!!",
      },
      {
        name: "Susan H.",
        date: "September 27, 2024",
        quote:
          "We had a great experience with Jen & John, our old girl did great. We really appreciated the updates, as well as their care of our home!",
      },
      {
        name: "Lisa H.",
        date: "August 20, 2024",
        quote:
          "Jennifer and John took great care of our dogs. One of them had recent surgery, and they kept up with meds and helped her around. Both dogs were happy and content when we returned. As an added bonus, the house was very tidy, and the sheets and towels they used were washed and the bed was remade. I highly recommend this fantastic couple to look after your pets!",
      },
      {
        name: "Daniela J.",
        date: "August 11, 2024",
        quote:
          "They were both wonderful watching Passion. When I returned home Passion was very calm which is not normal when I've been gone awhile. She was obviously comfortable with Jennifer and John.",
      },
      {
        name: "Kelly C.",
        date: "August 11, 2024",
        quote:
          "Jennifer and John did a great job taking care of my fur baby and my house! We were gone for an extended amount of time and we came home to a happy puppy and a clean home. They updated with pictures and let me know that Aspen was doing well! So thankful for the peace of mind while we were away!",
      },
      {
        name: "Jessica S.",
        date: "July 1, 2024",
        quote:
          "Jennifer and her husband took amazing care of my dogs and house! They followed all of the routines I gave them and even went above and beyond by washing their bed sheets and towels, re-making the beds and taking out the trash. I came home to a clean house and happy pups! It was nice being away and not having to worry about a thing back home. I highly recommend them to anyone looking for a reliable pet sitter. Thank you guys!!",
      },
      {
        name: "Britt C.",
        date: "April 29, 2024",
        quote:
          "Jennifer is super responsive and easy to communicate with! She also kept me updated while I was away, which is definitely appreciated.",
      },
      {
        name: "Jamie C.",
        date: "April 8, 2024",
        quote:
          "Jennifer went above and beyond for our Koda! So many walks and so much playtime and love was given to our girl. She treated Koda like she was her own. Due to car troubles, we could not make it home in time to pick her up. Jennifer was more than accommodating, working with us and letting our pup stay an extra day. I'll never have anyone else take care of our Koda!!",
      },
      {
        name: "Michelle L.",
        date: "March 21, 2024",
        quote:
          "Very happy with the care Jennifer provided for our young puppy. She kept the puppy happy and we had no problems. She responded quickly to any questions which put me at ease while I was out of town.",
      },
    ];

    try {
      // Use the Convex HTTP API to call the seedReviews mutation
      const response = await fetch(`${deploymentUrl}/api/mutation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: "mutations:seedReviews",
          args: {},
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `Convex API error: ${response.status} ${errorText}`,
        };
      }

      return {
        success: true,
        message:
          "Seed mutation called. Deploy the Convex functions first, then call this endpoint.",
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }
);
