"use client";

import React, { useRef, useEffect } from "react";
import {
  Renderer,
  Camera,
  Transform,
  Sphere,
  Program,
  Mesh,
} from "ogl";

const SIZE = 280;
// Forest green #1A5D3B -> lighter #2d8a5e
const GREEN_DARK = [26 / 255, 93 / 255, 59 / 255];
const GREEN_LIGHT = [45 / 255, 138 / 255, 94 / 255];

export default function VoiceOrb() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    container.appendChild(canvas);

    const renderer = new Renderer({
      canvas,
      width: SIZE,
      height: SIZE,
      alpha: true,
      dpr: Math.min(2, typeof window !== "undefined" ? window.devicePixelRatio : 1),
    });
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);

    const camera = new Camera(gl);
    camera.position.z = 2.2;

    const scene = new Transform();

    const geometry = new Sphere(gl, {
      radius: 0.65,
      widthSegments: 32,
      heightSegments: 24,
    });

    const program = new Program(gl, {
      vertex: /* glsl */ `
        attribute vec3 position;
        attribute vec3 normal;

        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        uniform mat3 normalMatrix;

        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragment: /* glsl */ `
        precision highp float;

        uniform float uTime;
        uniform vec3 uColorDark;
        uniform vec3 uColorLight;

        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
          float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 1.8);
          float pulse = 0.85 + 0.15 * sin(uTime * 2.0);
          vec3 color = mix(uColorDark, uColorLight, fresnel * pulse);
          float alpha = 0.92 + 0.08 * fresnel;
          gl_FragColor = vec4(color, alpha);
        }
      `,
      uniforms: {
        uTime: { value: 0 },
        uColorDark: { value: GREEN_DARK },
        uColorLight: { value: GREEN_LIGHT },
      },
      transparent: true,
      cullFace: false,
    });

    const mesh = new Mesh(gl, { geometry, program });
    mesh.setParent(scene);

    let time = 0;
    function update() {
      rafRef.current = requestAnimationFrame(update);
      time += 0.016;
      mesh.rotation.y = time * 0.15;
      mesh.rotation.x = Math.sin(time * 0.5) * 0.08;
      program.uniforms.uTime.value = time;
      renderer.render({ scene, camera });
    }
    update();

    return () => {
      cancelAnimationFrame(rafRef.current);
      if (container && canvas.parentNode === container) {
        container.removeChild(canvas);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-48 h-48 md:w-64 md:h-64 flex items-center justify-center"
      style={{ minWidth: SIZE, minHeight: SIZE }}
      aria-hidden
    />
  );
}
