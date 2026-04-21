interface HeaderLogoProps {
  logoUrl?: string
  brandName: string
  size: number
  className?: string
}

/**
 * Header 品牌 Logo
 * 有 logo_url 时显示图片,否则显示品牌名首字红色方块
 */
export function HeaderLogo({ logoUrl, brandName, size, className }: HeaderLogoProps) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={brandName}
        className={className}
        style={{ width: size, height: size, objectFit: "contain" }}
      />
    )
  }

  return (
    <span
      className={`inline-flex items-center justify-center bg-primary text-white font-bold ${className || ""}`}
      style={{ width: size, height: size, fontSize: size * 0.5 }}
    >
      {brandName.charAt(0)}
    </span>
  )
}
