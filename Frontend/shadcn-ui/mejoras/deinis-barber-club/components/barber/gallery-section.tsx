const galleryItems = [
  {
    image: "/professional-barber-cutting-hair-close-up.jpg",
    label: "Trabajo Profesional",
  },
  {
    image: "/happy-client-getting-haircut-in-barbershop.jpg",
    label: "Experiencia Cliente",
  },
  {
    image: "/professional-barber-tools-scissors-clippers.jpg",
    label: "Equipamiento",
  },
  {
    image: "/modern-mens-haircut-fade-style.jpg",
    label: "Cortes",
  },
  {
    image: "/beard-trim-grooming-result.jpg",
    label: "Resultados",
  },
  {
    image: "/modern-barbershop-interior-design.jpg",
    label: "Instalaciones",
  },
]

export function GallerySection() {
  return (
    <section id="galeria" className="py-16 sm:py-20 md:py-24 lg:py-32 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 font-serif">Galería de Trabajos</h2>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed px-4">
            Descubre nuestro trabajo y la experiencia que ofrecemos. Cada corte es una obra de arte, cada cliente una
            historia única.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {galleryItems.map((item, index) => (
            <div
              key={index}
              className="group relative aspect-square rounded-xl overflow-hidden cursor-pointer shadow-lg hover:shadow-2xl transition-shadow duration-300"
            >
              <img
                src={item.image || "/placeholder.svg"}
                alt={item.label}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm px-4 py-2 rounded-lg border border-border shadow-md">
                <p className="text-sm font-semibold">{item.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
