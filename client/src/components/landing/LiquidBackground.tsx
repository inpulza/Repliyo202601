import { Canvas, useFrame } from '@react-three/fiber';
import { useRef, useMemo } from 'react';
import * as THREE from 'three';

const fragmentShader = `
uniform float uTime;
uniform float uSpeed;
uniform float uScale;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorC;
varying vec2 vUv;

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m;
  m = m*m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;
  for(int i = 0; i < 4; i++) {
    value += amplitude * snoise(p * frequency);
    amplitude *= 0.5;
    frequency *= 2.0;
  }
  return value;
}

void main() {
  vec2 uv = vUv * uScale;
  
  float time = uTime * uSpeed;
  
  vec2 q = vec2(0.0);
  q.x = fbm(uv + vec2(1.0, 0.0) + 0.5 * time);
  q.y = fbm(uv + vec2(0.0, 1.0) + 0.4 * time);
  
  vec2 r = vec2(0.0);
  r.x = fbm(uv + 2.0 * q + vec2(1.7, 9.2) + 0.1 * time);
  r.y = fbm(uv + 2.0 * q + vec2(8.3, 2.8) + 0.08 * time);
  
  float f = fbm(uv + 2.0 * r);
  
  float pattern = (f * f * f + 0.6 * f * f + 0.5 * f);
  pattern = clamp(pattern, 0.0, 1.0);
  
  vec3 color = mix(uColorA, uColorB, clamp(length(q) * 0.8, 0.0, 1.0));
  color = mix(color, uColorC, clamp(length(r.x) * 0.7, 0.0, 1.0));
  color = mix(color, uColorA, clamp(pattern * pattern * 0.6, 0.0, 1.0));
  
  float grain = (fract(sin(dot(vUv * 800.0 + uTime * 0.5, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 0.06;
  color += grain;
  
  gl_FragColor = vec4(color, 1.0);
}
`;

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

interface GradientMeshProps {
  colorA: string;
  colorB: string;
  colorC: string;
  speed: number;
  scale: number;
}

function GradientMesh({ colorA, colorB, colorC, speed, scale }: GradientMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSpeed: { value: speed },
      uScale: { value: scale },
      uColorA: { value: new THREE.Color(colorA) },
      uColorB: { value: new THREE.Color(colorB) },
      uColorC: { value: new THREE.Color(colorC) },
    }),
    [colorA, colorB, colorC, speed, scale]
  );

  useFrame((state) => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.ShaderMaterial;
      material.uniforms.uTime.value = state.clock.getElapsedTime();
    }
  });

  return (
    <mesh ref={meshRef} scale={[10, 10, 1]}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        fragmentShader={fragmentShader}
        vertexShader={vertexShader}
        uniforms={uniforms}
      />
    </mesh>
  );
}

interface LiquidBackgroundProps {
  className?: string;
  colorStart?: string;
  colorMid?: string;
  colorEnd?: string;
  speed?: number;
  scale?: number;
}

export function LiquidBackground({ 
  className = '', 
  colorStart = '#2a2a3a',
  colorMid = '#e5e5e5',
  colorEnd = '#f5f5f5',
  speed = 0.03,
  scale = 0.6
}: LiquidBackgroundProps) {
  return (
    <div className={`absolute inset-0 ${className}`}>
      <Canvas 
        camera={{ position: [0, 0, 1] }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <GradientMesh 
          colorA={colorStart} 
          colorB={colorMid} 
          colorC={colorEnd} 
          speed={speed}
          scale={scale}
        />
      </Canvas>
    </div>
  );
}
