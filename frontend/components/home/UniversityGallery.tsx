"use client"

/**
 * 首页院校轮播 Gallery。
 * 深色背景，从 API 拉取 featured 院校，使用 shadcn Carousel 展示。
 */

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { Building2 } from "lucide-react"
import Autoplay from "embla-carousel-autoplay"
import api from "@/lib/api"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi,
} from "@/components/ui/carousel"

interface University {
  id: string
  name: string
  name_en: string | null
  description: string | null
  logo_image_id: string | null
  banner_image_id: string | null
  country: string
  city: string
}

/** 首页院校轮播 */
export function UniversityGallery() {
  const t = useTranslations("Home")
  const [universities, setUniversities] = useState<University[]>([])
  const [carouselApi, setCarouselApi] = useState<CarouselApi>()
  const [current, setCurrent] = useState(0)
  const [count, setCount] = useState(0)

  useEffect(() => {
    api
      .get("/public/universities/list", { params: { is_featured: true, page_size: 10 } })
      .then((res) => setUniversities(res.data.items ?? []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!carouselApi) return
    setCount(carouselApi.scrollSnapList().length)
    setCurrent(carouselApi.selectedScrollSnap())
    carouselApi.on("select", () => {
      setCurrent(carouselApi.selectedScrollSnap())
    })
  }, [carouselApi])

  if (universities.length === 0) return null

  return (
    <section className="bg-gray-900 py-12 md:py-20">
      <div className="mx-auto max-w-7xl px-4">
        <div className="text-center">
          <h2 className="text-sm font-medium uppercase tracking-widest text-gray-400">
            Partner Universities
          </h2>
          <h3 className="mt-2 text-2xl font-bold text-white md:text-3xl">
            {t("featuredUniversities")}
          </h3>
          <div className="mx-auto mt-3 h-0.5 w-12 bg-primary" />
        </div>

        <div className="mt-10">
          <Carousel
            setApi={setCarouselApi}
            opts={{ loop: true, align: "center" }}
            plugins={[Autoplay({ delay: 5000, stopOnInteraction: true })]}
            className="mx-auto max-w-5xl"
          >
            <CarouselContent>
              {universities.map((uni) => (
                <CarouselItem key={uni.id}>
                  <div className="overflow-hidden rounded-2xl bg-gray-800">
                    <div className="relative aspect-[21/9] w-full">
                      {uni.banner_image_id || uni.logo_image_id ? (
                        <img
                          src={`/api/public/images/detail?id=${uni.banner_image_id || uni.logo_image_id}`}
                          alt={uni.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-gray-700">
                          <Building2 className="h-16 w-16 text-gray-500" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 to-transparent" />
                    </div>
                    <div className="p-6 md:p-8">
                      <h4 className="text-xl font-bold text-white md:text-2xl">{uni.name}</h4>
                      {uni.name_en && <p className="mt-1 text-sm text-gray-400">{uni.name_en}</p>}
                      <p className="mt-1 text-sm text-gray-500">{uni.city}, {uni.country}</p>
                      {uni.description && (
                        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-gray-300">
                          {uni.description.replace(/<[^>]*>/g, "")}
                        </p>
                      )}
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-0 border-gray-600 bg-white/10 text-white backdrop-blur hover:bg-white/20 hover:text-white" />
            <CarouselNext className="right-0 border-gray-600 bg-white/10 text-white backdrop-blur hover:bg-white/20 hover:text-white" />
          </Carousel>

          {/* 导航点 */}
          {count > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              {Array.from({ length: count }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => carouselApi?.scrollTo(i)}
                  className={`h-2 rounded-full transition-all ${
                    i === current ? "w-6 bg-primary" : "w-2 bg-gray-600"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
