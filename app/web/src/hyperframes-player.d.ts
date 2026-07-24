// JSX typing for the <hyperframes-player> custom element registered by the
// side-effect import `import "@hyperframes/player"` in main.tsx.
//
// React 18 sets unrecognized props on custom elements (tag names containing a
// dash) via setAttribute, and it stringifies booleans — `controls={true}`
// renders as the attribute `controls="true"`, not HTML's boolean "presence"
// form. The player's observedAttributes reads these the standard HTML way
// (presence = on), so boolean attributes are typed as `string` here. Pass
// them the same way you would on a plain <video>: `controls=""`, not
// `controls={true}`.
import type { CSSProperties, ReactNode, Ref } from "react";

export {};

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "hyperframes-player": {
        src?: string;
        /** Presence = on. Pass as `controls=""`. */
        controls?: string;
        /** Presence = on. Pass as `autoplay=""`. */
        autoplay?: string;
        /** Presence = on. Pass as `loop=""`. */
        loop?: string;
        /** Presence = on. Pass as `muted=""`. */
        muted?: string;
        width?: string | number;
        height?: string | number;
        style?: CSSProperties;
        className?: string;
        ref?: Ref<HTMLElement>;
        children?: ReactNode;
      };
    }
  }
}
