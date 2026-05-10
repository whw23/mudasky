"use client"

/**
 * ECharts 地图渲染内部组件。
 * 加载世界地图 + 中国/德国/日本/新加坡省级地图，合并后渲染。
 * hover 省份时高亮整个国家（显示完整国界线）。
 */

import { useEffect, useRef } from "react"

interface Props {
  latitude: number
  longitude: number
  name: string
  country: string
}

const DETAIL_MAPS = [
  { file: "/geo/china.json", worldName: "中国" },
  { file: "/geo/germany.json", worldName: "德国" },
  { file: "/geo/japan.json", worldName: "日本" },
  { file: "/geo/singapore.json", worldName: "新加坡" },
]

/** 合并省级数据到世界地图，返回合并数据和省→国映射 */
function mergeGeoData(
  worldData: any,
  detailDataList: any[],
): { mapData: any; provinceGroups: Record<string, string[]> } {
  const removeNames = new Set(DETAIL_MAPS.map((m) => m.worldName))
  const filtered = worldData.features.filter(
    (f: any) => !removeNames.has(f.properties?.name),
  )

  const provinceGroups: Record<string, string[]> = {}
  const allDetailFeatures: any[] = []
  detailDataList.forEach((data, i) => {
    const countryName = DETAIL_MAPS[i].worldName
    const names: string[] = []
    for (const feat of data.features) {
      allDetailFeatures.push(feat)
      if (feat.properties?.name) names.push(feat.properties.name)
    }
    provinceGroups[countryName] = names
  })

  return {
    mapData: {
      type: "FeatureCollection",
      features: [...filtered, ...allDetailFeatures],
    },
    provinceGroups,
  }
}

/** 加载 ECharts 脚本（全局单例） */
function loadEcharts(): Promise<any> {
  if ((window as any).echarts) return Promise.resolve((window as any).echarts)
  return new Promise((resolve, reject) => {
    const script = document.createElement("script")
    script.src = "/vendor/echarts.min.js"
    script.onload = () => resolve((window as any).echarts)
    script.onerror = () => reject(new Error("Failed to load ECharts"))
    document.head.appendChild(script)
  })
}

/** 构建省份→国家映射 */
function buildProvinceToCountry(provinceGroups: Record<string, string[]>): Record<string, string> {
  const map: Record<string, string> = {}
  for (const [country, provinces] of Object.entries(provinceGroups)) {
    for (const p of provinces) map[p] = country
  }
  return map
}

/** 绑定 hover 事件：省份 hover 时高亮整个国家 */
function bindCountryHover(
  chart: any,
  provinceGroups: Record<string, string[]>,
) {
  const provinceToCountry = buildProvinceToCountry(provinceGroups)
  let lastHighlighted: string[] = []

  chart.on("mouseover", (params: any) => {
    if (params.componentType !== "geo") return
    const country = provinceToCountry[params.name]
    if (!country) return

    const siblings = provinceGroups[country]
    if (!siblings) return

    lastHighlighted = siblings
    for (const n of siblings) {
      chart.dispatchAction({ type: "highlight", geoIndex: 0, name: n })
    }
  })

  chart.on("mouseout", (params: any) => {
    if (params.componentType !== "geo") return
    for (const n of lastHighlighted) {
      chart.dispatchAction({ type: "downplay", geoIndex: 0, name: n })
    }
    lastHighlighted = []
  })
}

/** 将经度转换为地图数据范围（亚洲中心地图使用 -28.8~352 而非 -180~180） */
function normalizeLon(lon: number): number {
  return lon < -28.8 ? lon + 360 : lon
}

/** 地图渲染内部实现 */
export default function UniversityMapInner({
  latitude,
  longitude,
  name,
}: Props) {
  const mapLon = normalizeLon(longitude)
  const innerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const inner = innerRef.current
    if (!inner) return

    let chart: any = null

    async function init() {
      const echarts = await loadEcharts()
      if (!inner) return

      const [worldData, ...detailDataList] = await Promise.all([
        fetch("/geo/world.json").then((r) => r.json()),
        ...DETAIL_MAPS.map((m) => fetch(m.file).then((r) => r.json())),
      ])
      if (!inner) return

      const { mapData, provinceGroups } = mergeGeoData(
        worldData,
        detailDataList,
      )
      echarts.registerMap("world-detail", mapData)

      const provinceToCountry = buildProvinceToCountry(provinceGroups)

      chart = echarts.init(inner)
      chart.setOption({
        geo: {
          map: "world-detail",
          roam: true,
          center: [mapLon, latitude],
          zoom: 7,
          itemStyle: { areaColor: "#e8eaed", borderColor: "#c4c7cc" },
          emphasis: {
            itemStyle: { areaColor: "#d4d7dc", borderColor: "#9ca3af" },
            label: { show: false },
          },
          label: { show: false },
          tooltip: {
            show: true,
            formatter: (params: any) => {
              const country = provinceToCountry[params.name]
              return country ? `${country} · ${params.name}` : params.name
            },
          },
        },
        series: [
          {
            type: "effectScatter",
            coordinateSystem: "geo",
            data: [{ name, value: [mapLon, latitude] }],
            symbolSize: 12,
            rippleEffect: { brushType: "stroke", scale: 4 },
            itemStyle: { color: "#dc2626" },
            label: {
              show: true,
              position: "right",
              formatter: "{b}",
              fontSize: 13,
              fontWeight: "bold",
              color: "#1f2937",
            },
          },
        ],
        tooltip: {
          trigger: "item",
          formatter: (params: any) => {
            if (params.componentType === "geo") {
              const country = provinceToCountry[params.name]
              return country ? `${country} · ${params.name}` : params.name
            }
            return params.name
          },
        },
      })

      bindCountryHover(chart, provinceGroups)

      const onResize = () => chart?.resize()
      window.addEventListener("resize", onResize)
      chart.__resizeHandler = onResize
    }

    init()

    return () => {
      if (chart) {
        window.removeEventListener("resize", chart.__resizeHandler)
        chart.dispose()
      }
    }
  }, [latitude, longitude, name])

  return (
    <div style={{ borderRadius: "0.5rem", overflow: "hidden" }}>
      <div ref={innerRef} style={{ width: "100%", height: "300px" }} />
    </div>
  )
}
