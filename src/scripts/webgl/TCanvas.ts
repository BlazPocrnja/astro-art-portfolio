import * as THREE from 'three'
import { gl } from './core/WebGL'
import { type Assets, loadAssets } from './utils/assetLoader'
import { controls } from './utils/OrbitControls'
import vertexShader from './shader/vs.glsl'
import fragmentShader from './shader/fs.glsl'
import { calcCoveredTextureScale } from './utils/coveredTexture'

export class TCanvas {
  private isCameraMoving = false;
  private assets: Assets = {
    image: { path: 'images/05_Pocrnja_Driftwood.jpg' },
  }

  constructor(private container: HTMLElement) {
    loadAssets(this.assets).then(() => {
      this.init()
      this.createObjects()
      this.handleCameraMovement()
      gl.requestAnimationFrame(this.anime)
    })
  }

  private init() {
    gl.setup(this.container)
    gl.camera.position.z = 1.5
  }

  private createObjects() {
    const texture = this.assets.image.data as THREE.Texture
    const aspectRatio = texture.image.width / texture.image.height
    const scale = calcCoveredTextureScale(texture, aspectRatio)

    // Create a canvas with visible edges
    const canvasWidth = aspectRatio
    const canvasHeight = 1
    const canvasDepth = 0.1

    const canvasGeometry = new THREE.BoxGeometry(canvasWidth, canvasHeight, canvasDepth)

    // Create a material for the front face with the image texture
    const canvasMaterialFront = new THREE.ShaderMaterial({
      uniforms: {
        tImage: { value: texture },
        uUvScale: { value: new THREE.Vector2(scale[0], scale[1]) },
      },
      vertexShader,
      fragmentShader,
      side: THREE.DoubleSide,
    })

    // Create a material for the other faces (edges)
    const canvasMaterialEdges = new THREE.MeshBasicMaterial({ color: 0x000000 })

    // Set material index 0 for all faces (default)
    canvasGeometry.groups.forEach((face) => {
      face.materialIndex = 1 // Set material index 1 for all faces
    })

    // Set material index 0 for the front face
    canvasGeometry.groups[4].materialIndex = 0

    // Assign materials to different faces of the box
    const canvasMaterials = [
      canvasMaterialFront, // Material for the front face (texture)
      canvasMaterialEdges, // Material for the other faces (edges)
    ]

    // Create a mesh with the multi-material applied
    const canvasMesh = new THREE.Mesh(canvasGeometry, canvasMaterials)
    canvasMesh.position.z = -0.05 // Position slightly below the image plane to give the illusion of depth
    gl.scene.add(canvasMesh)

    // Create shadow
    const shadowRadius = Math.max(canvasWidth, canvasHeight) * 0.6 
    const shadowGeometry = new THREE.CircleGeometry(shadowRadius, 32)
    const shadowMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.90, side: THREE.DoubleSide })
    const shadowMesh = new THREE.Mesh(shadowGeometry, shadowMaterial)
    shadowMesh.rotation.x = -Math.PI / 2 // Rotate to be parallel to the ground
    shadowMesh.position.y = -0.75 // Position slightly below the canvas
    gl.scene.add(shadowMesh)

    // Start rotation animation
    this.animateCanvasRotation(canvasMesh)
  }

  // ----------------------------------
  // animation
  private anime = () => {
    controls.update()
    gl.render()
  }

  private setCameraMovingStatus(value: boolean) {
    this.isCameraMoving = value;
  }

  private animateCanvasRotation(canvasMesh) {
    const animate = () => {
      if (!this.isCameraMoving) {
        canvasMesh.rotation.y += 0.01; // Adjust the rotation speed as needed
        gl.render();
        requestAnimationFrame(animate);
      }
    };
    animate();
  }

  // Function to control camera movement
  private handleCameraMovement() {
    // Listen for camera movement events or user interaction
    // For example, if using OrbitControls:
    controls.addEventListener('change', () => {
      this.setCameraMovingStatus(true);
    });
  }


  // ----------------------------------
  // dispose
  dispose() {
    gl.dispose()
  }
}
