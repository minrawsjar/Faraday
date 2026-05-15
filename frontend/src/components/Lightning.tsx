"use client";

import { useRef, useEffect } from "react";

interface LightningProps {
  hue?: number;
  xOffset?: number;
  speed?: number;
  intensity?: number;
  size?: number;
}

export function Lightning({
  hue = 200,
  xOffset = 0,
  speed = 1,
  intensity = 1.2,
  size = 1,
}: LightningProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: false });
    if (!gl) return;

    const vertexShaderSource = `
      attribute vec2 aPosition;
      void main() { gl_Position = vec4(aPosition, 0.0, 1.0); }
    `;

    const fragmentShaderSource = `
      precision mediump float;
      uniform vec2 iResolution;
      uniform float iTime;
      uniform float uHue;
      uniform float uXOffset;
      uniform float uSpeed;
      uniform float uIntensity;
      uniform float uSize;
      #define OCTAVE_COUNT 10
      vec3 hsv2rgb(vec3 c) {
        vec3 rgb = clamp(abs(mod(c.x*6.0+vec3(0.0,4.0,2.0),6.0)-3.0)-1.0,0.0,1.0);
        return c.z * mix(vec3(1.0), rgb, c.y);
      }
      float hash11(float p) { p=fract(p*.1031); p*=p+33.33; p*=p+p; return fract(p); }
      float hash12(vec2 p) {
        vec3 p3=fract(vec3(p.xyx)*.1031); p3+=dot(p3,p3.yzx+33.33);
        return fract((p3.x+p3.y)*p3.z);
      }
      mat2 rotate2d(float theta) { float c=cos(theta); float s=sin(theta); return mat2(c,-s,s,c); }
      float noise(vec2 p) {
        vec2 ip=floor(p); vec2 fp=fract(p);
        float a=hash12(ip); float b=hash12(ip+vec2(1.0,0.0));
        float c=hash12(ip+vec2(0.0,1.0)); float d=hash12(ip+vec2(1.0,1.0));
        vec2 t=smoothstep(0.0,1.0,fp);
        return mix(mix(a,b,t.x),mix(c,d,t.x),t.y);
      }
      float fbm(vec2 p) {
        float value=0.0; float amplitude=0.5;
        for(int i=0;i<OCTAVE_COUNT;++i) {
          value+=amplitude*noise(p); p*=rotate2d(0.45); p*=2.0; amplitude*=0.5;
        }
        return value;
      }
      void mainImage(out vec4 fragColor, in vec2 fragCoord) {
        vec2 uv=fragCoord/iResolution.xy;
        uv=2.0*uv-1.0;
        uv.x*=iResolution.x/iResolution.y;
        uv.x+=uXOffset;
        uv+=2.0*fbm(uv*uSize+0.8*iTime*uSpeed)-1.0;
        float dist=abs(uv.x);
        vec3 baseColor=hsv2rgb(vec3(uHue/360.0,0.7,0.8));
        vec3 col=baseColor*pow(mix(0.0,0.07,hash11(iTime*uSpeed))/dist,1.0)*uIntensity;
        float a=clamp(max(col.r,max(col.g,col.b)),0.0,1.0);
        fragColor=vec4(col,a);
      }
      void main() { mainImage(gl_FragColor,gl_FragCoord.xy); }
    `;

    const compileShader = (source: string, type: number) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return null;
      return shader;
    };

    const vs = compileShader(vertexShaderSource, gl.VERTEX_SHADER);
    const fs = compileShader(fragmentShaderSource, gl.FRAGMENT_SHADER);
    if (!vs || !fs) return;

    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.useProgram(program);

    const verts = new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);

    const pos = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    const uRes  = gl.getUniformLocation(program, "iResolution");
    const uTime = gl.getUniformLocation(program, "iTime");
    const uHueL = gl.getUniformLocation(program, "uHue");
    const uOff  = gl.getUniformLocation(program, "uXOffset");
    const uSpd  = gl.getUniformLocation(program, "uSpeed");
    const uInt  = gl.getUniformLocation(program, "uIntensity");
    const uSz   = gl.getUniformLocation(program, "uSize");

    const start = performance.now();
    let raf: number;

    const render = () => {
      resizeCanvas();
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, (performance.now() - start) / 1000);
      gl.uniform1f(uHueL, hue);
      gl.uniform1f(uOff, xOffset);
      gl.uniform1f(uSpd, speed);
      gl.uniform1f(uInt, intensity);
      gl.uniform1f(uSz, size);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [hue, xOffset, speed, intensity, size]);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: "block", width: "100%", height: "100%" }}
    />
  );
}
