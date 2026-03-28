export const HERO_SHADER = `
// Constants for physics and styling
#define PI 3.14159265359

// Noise functions for fluid base
float hash(vec2 p) {
    p = fract(p * vec2(234.34, 435.345));
    p += dot(p, p + 34.23);
    return fract(p.x * p.y);
}

float smoothNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    for (int i = 0; i < 5; i++) {
        value += amplitude * smoothNoise(p * frequency);
        frequency *= 2.0;
        amplitude *= 0.5;
    }
    return value;
}

// Physics constants moved to uniform-like defines for performance
#define WAVE_SPEED 0.4
#define WAVENUMBER 70.0
#define WAVE_DECAY 6.0
#define WAVE_ENVELOPE 15.0
#define WAVE_AMP 0.08

// Optimized capillary wave calculation that returns height and normal contribution
// This avoids redundant distance and math calculations
void addWave(vec2 dropPos, vec2 p, float t, inout float totalH, inout vec2 normOff) {
    vec2 rel = p - dropPos;
    float d = length(rel);
    
    float vt = WAVE_SPEED * t;
    float dminusvt = d - vt;
    
    // Early exit for performance if ripple is outside active range
    float env = max(0.0, 1.0 - abs(dminusvt) * WAVE_ENVELOPE) * exp(-t * WAVE_DECAY);
    if (env < 0.001) return;

    // Smooth activation (prevents popping)
    float activeMask = smoothstep(-0.05, 0.1, t - d/WAVE_SPEED);
    if (activeMask < 0.001) return;

    float phase = dminusvt * WAVENUMBER;
    float sinP = sin(phase);
    float cosP = cos(phase);
    
    totalH += sinP * env * activeMask * WAVE_AMP;
    
    // Normal contribution (analytical gradient)
    if (d > 0.001) {
        normOff += (rel / d) * (WAVENUMBER * cosP * env * activeMask * WAVE_AMP);
    }
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float aspect = iResolution.x / iResolution.y;
    vec2 p = uv - vec2(0.5, 0.5);
    p.x *= aspect;

    float t = iTime * 0.12;

    // --- MOUSE TRAIL (iChannel1) ---
    vec4 trailData = texture2D(iChannel1, uv);
    float trail = trailData.r;

    // --- PROCEDURAL CAPILLARY WAVES (DROPLETS) ---
    float totalHeight = 0.0;
    vec2 normalOffset = vec2(0.0);
    
    vec2 gridP = p * 4.0;
    vec2 id = floor(gridP);
    
    for(int y=-1; y<=1; y++) {
        for(int x=-1; x<=1; x++) {
            vec2 cell = id + vec2(float(x), float(y));
            if (hash(cell) > 0.92) {
                vec2 dropPos = (cell + vec2(hash(cell+1.0), hash(cell+2.0))) / 4.0;
                float localTime = mod(iTime * 1.5 + hash(cell + 3.0) * 100.0, 3.0);
                addWave(dropPos, p, localTime, totalHeight, normalOffset);
            }
        }
    }
    
    // Add mouse trail "height" and rough normal
    totalHeight += trail * 0.02;
    // Approximate normal for trail based on noise
    vec2 trailGrad = vec2(
        smoothNoise(p * 15.0 - iTime) - 0.5,
        smoothNoise(p * 15.0 - iTime + 7.0) - 0.5
    );
    normalOffset += trailGrad * trail * 0.1;
    
    // --- FLUID BASE ---
    vec2 displacedP = p + normalOffset;
    if (trail > 0.001) {
        float angle = trail * 6.28 + t;
        vec2 offset = vec2(cos(angle), sin(angle)) * trail * 0.35;
        displacedP += offset * smoothNoise(p * 6.0 + t * 1.5);
    }
    float n = fbm(displacedP * 3.5 + t + trail * 1.8);

    // --- BACKGROUND IMAGE (iChannel2) ---
    vec2 imgAspect = vec2(1.0);
    float imgRatio = 1.7777; // approx 16/9 for pexels photo
    vec2 coverUV;
    if (aspect > imgRatio) {
        coverUV = vec2(uv.x, 0.5 + (uv.y - 0.5) * (aspect / imgRatio));
    } else {
        coverUV = vec2(0.5 + (uv.x - 0.5) * (imgRatio / aspect), uv.y);
    }

    // Refract background UVs using our calculated normal offset
    // This creates the glass/water distortion effect
    float refractionStrength = 0.5;
    vec2 refractedUV = coverUV + normalOffset * refractionStrength;
    
    // Also add the macro-fluid distortion
    float morphStrength = trail * 0.06;
    refractedUV += vec2(
        smoothNoise(displacedP * 4.0 + t) - 0.5,
        smoothNoise(displacedP * 4.0 + t + 5.4) - 0.5
    ) * morphStrength;

    vec4 imgColor = texture2D(iChannel2, refractedUV);

    // --- COLOR PALETTE ---
    vec3 colorBlack    = vec3(0.01, 0.02, 0.03);
    vec3 colorGray     = vec3(0.13, 0.16, 0.20);
    vec3 colorBlueGray = vec3(0.27, 0.37, 0.50);
    vec3 colorWhite    = vec3(0.83, 0.90, 0.96);

    vec3 baseLiquid = mix(colorBlack, colorGray, n);
    vec3 fluidColor = mix(baseLiquid, colorBlueGray, smoothstep(0.38, 0.78, n));

    // Blend background image
    vec3 imgBlended = imgColor.rgb * vec3(0.55, 0.60, 0.65);
    float imgMix = smoothstep(0.35, 0.75, n);
    imgMix = clamp(imgMix * 0.45, 0.0, 0.5);
    fluidColor = mix(fluidColor, imgBlended, imgMix);

    // --- OVERLAY IMAGE (iChannel3) ---
    // Sample the overlay image using the same refracted UVs
    vec4 overlayColor = texture2D(iChannel3, refractedUV);
    
    // Smoothly multiply the overlay into the fluid, gated by the JS fade variable
    // This makes the overlay appear seamlessly when loaded, without a hard pop
    vec3 overlayBlended = overlayColor.rgb * vec3(0.9, 0.95, 1.0); // Slight cool tint
    fluidColor = mix(fluidColor, fluidColor * overlayBlended * 1.5, overlayFade * 0.65);

    // Add specular highlights on the wave crests (where height is positive and high)
    float specular = smoothstep(0.01, 0.03, totalHeight);
    fluidColor += colorWhite * specular * 10.0; // Radiance set to 10
    
    // Add shadows in the wave troughs
    float shadow = smoothstep(0.0, -0.02, totalHeight);
    fluidColor -= colorBlack * shadow * 0.3;

    // Mouse trail shimmer
    fluidColor = mix(fluidColor, colorWhite * 0.72, trail * 0.42);
    fluidColor += colorBlueGray * trail * 0.22;

    fragColor = vec4(clamp(fluidColor, 0.0, 1.0), 1.0);
}
`;