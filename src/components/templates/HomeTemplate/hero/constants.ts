export const HERO_SHADER = `
float noise(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float smoothNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = noise(i);
    float b = noise(i + vec2(1.0, 0.0));
    float c = noise(i + vec2(0.0, 1.0));
    float d = noise(i + vec2(1.0, 1.0));
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

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float aspect = iResolution.x / iResolution.y;
    vec2 p = uv - vec2(0.5, 0.5);
    p.x *= aspect;
    
    float t = iTime * 0.1;
    
    vec2 screenUV = fragCoord / iResolution.xy;
    vec4 trailData = texture2D(iChannel1, screenUV);
    float trail = trailData.r;

    float n = fbm(p * 3.0 + t + trail * 2.0);
    
    vec3 color1 = vec3(0.05, 0.05, 0.05); // Black
    vec3 color2 = vec3(0.43, 0.36, 0.99); // Accent #6d5dfc
    
    vec3 finalColor = mix(color1, color2, n * (0.5 + trail));
    
    fragColor = vec4(finalColor, 1.0);
}
`;
