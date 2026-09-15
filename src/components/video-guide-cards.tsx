import { Icon } from "./icons";

export function VideoCard({ title, product }: { title: string; product: string }) {
  return <article className="video-card">
    <div className="video-thumb" aria-hidden="true">
      <span className="video-play"><Icon name="arrow" /></span>
      <span className="video-status">Demo Preview — Coming Soon</span>
    </div>
    <span className="eyebrow">{product}</span>
    <h3>{title}</h3>
  </article>;
}

export function GuideCard({ title, product }: { title: string; product: string }) {
  return <article className="guide-card">
    <Icon name="invoice" />
    <div><span className="eyebrow">{product}</span><h3>{title}</h3><span className="guide-status">Guide Coming Soon</span></div>
  </article>;
}
