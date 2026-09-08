const photos = [
  { src: "/pets/Belly Rubs.webp", alt: "Dog getting belly rubs" },
  { src: "/pets/Bubble Time.webp", alt: "Dog enjoying bubble time" },
  { src: "/pets/Cat.webp", alt: "Cat relaxing" },
  { src: "/pets/Three sleepers.webp", alt: "Three dogs sleeping" },
  { src: "/pets/Christmas Yorkie.webp", alt: "Yorkie at Christmas" },
  { src: "/pets/Feild.webp", alt: "Dog in a field" },
  { src: "/pets/Frisco.webp", alt: "Dog named Frisco" },
  { src: "/pets/Guinea Pigs.webp", alt: "Guinea pigs" },
  { src: "/pets/Happy Boy.webp", alt: "Happy dog" },
  { src: "/pets/Kitten.webp", alt: "Kitten" },
  { src: "/pets/Percy Cat.webp", alt: "Cat named Percy" },
  { src: "/pets/Play.webp", alt: "Dogs playing" },
  { src: "/pets/Pug.webp", alt: "Pug" },
  { src: "/pets/Shocked Luther.webp", alt: "Surprised dog named Luther" },
  { src: "/pets/Two Pups.webp", alt: "Two puppies" },
];

export default function PetGallery() {
  return (
    <section className="py-12 px-6 bg-brand-cream">
      <div className="max-w-5xl mx-auto">
        <h2 className="font-sans text-2xl font-semibold tracking-wide uppercase text-center text-brand-brown mb-8">
          Our Furry Friends
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {photos.map((photo, i) => (
            <div
              key={i}
              className="aspect-square rounded-xl overflow-hidden shadow-sm border border-brand-tan/20 hover:shadow-md transition-shadow bg-brand-brown/5"
            >
              <img
                src={photo.src}
                alt={photo.alt}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
        <p className="font-script text-xl text-center text-brand-tan mt-6">
          From puppies to seniors, cats to guinea pigs — we love them all.
        </p>
      </div>
    </section>
  );
}
