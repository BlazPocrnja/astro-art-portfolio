import * as THREE from 'three'
import { gl } from './core/WebGL'
import { type Assets, loadAssets } from './utils/assetLoader'
import { controls } from './utils/OrbitControls'
import vertexShader from './shader/vs.glsl'
import fragmentShader from './shader/fs.glsl'
import { calcCoveredTextureScale } from './utils/coveredTexture'
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry'

export class TCanvas {
  private isCameraMoving = false
  private isFirstChangeIgnored = false
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
    gl.camera.position.set(0, 0.5, 2)
  }

  private createObjects() {
    /*-----------Lights-----------*/
    gl.scene.add(new THREE.AmbientLight(0xcccccc))

    const spotLight = new THREE.SpotLight(0xffffff, 60)
    spotLight.angle = Math.PI / 5
    spotLight.penumbra = 0.2
    spotLight.position.set(2, 3, 3)
    spotLight.castShadow = true
    spotLight.shadow.camera.near = 3
    spotLight.shadow.camera.far = 10
    spotLight.shadow.mapSize.width = 1024
    spotLight.shadow.mapSize.height = 1024
    gl.scene.add(spotLight)

    const dirLight = new THREE.DirectionalLight(0x55505a, 3)
    dirLight.position.set(0, 3, 0)
    dirLight.castShadow = true
    dirLight.shadow.camera.near = 1
    dirLight.shadow.camera.far = 10

    dirLight.shadow.camera.right = 1
    dirLight.shadow.camera.left = -1
    dirLight.shadow.camera.top = 1
    dirLight.shadow.camera.bottom = -1

    dirLight.shadow.mapSize.width = 1024
    dirLight.shadow.mapSize.height = 1024
    gl.scene.add(dirLight)

    /*-----------Geometry-----------*/
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
    const canvasMaterialEdges = new THREE.MeshPhongMaterial({ color: 0xff174d, shininess: 100, side: THREE.DoubleSide })

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
    canvasMesh.castShadow = true
    gl.scene.add(canvasMesh)

    // Create the wireframe geometry and line segments
    const wireframeGeometry = new THREE.WireframeGeometry(canvasGeometry)
    const wireframeMaterial = new THREE.LineBasicMaterial({ color: 0xffffff })
    const wireframe = new THREE.LineSegments(wireframeGeometry, wireframeMaterial)

    // Create ground plance
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshPhongMaterial({ color: 0xffffff, depthWrite: false }))
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -0.75 // Position slightly below the canvas
    ground.receiveShadow = true
    gl.scene.add(ground)

    const grid = new THREE.GridHelper(40, 20, 0x000000, 0x000000)
    grid.material.opacity = 0.2
    grid.material.transparent = true
    grid.position.y = -0.75
    gl.scene.add(grid)

    /*-----------Background-----------*/
    texture.mapping = THREE.EquirectangularReflectionMapping
    gl.scene.background = texture
    gl.scene.backgroundBlurriness = 1
    gl.scene.backgroundIntensity = 1
    gl.scene.fog = new THREE.Fog(0xa0a0a0, 4, 20)

    /*-----------Animation-----------*/
    this.animateCanvasRotation(canvasMesh)

    /*-----------Effects-----------*/
    this.toggleMeshDisplay(canvasMesh, wireframe)

    /*-----------GUI-----------*/
    // const loader = new FontLoader()
    // loader.load('../../../public/fonts/helvetiker_regular.typeface.json', function (font) {
    //   const size = 0.1

    //   const labelgeo = new TextGeometry('Driftwood', {
    //     font: font,
    //     size: size,
    //     height: size / 2,
    //   })

    //   labelgeo.computeBoundingSphere()

    //   const material = new THREE.MeshPhongMaterial({ color: 0xff174d, shininess: 100, side: THREE.DoubleSide })

    //   const group = new THREE.Group()
    //   gl.scene.add(group)

    //   const textmesh = new THREE.Mesh(labelgeo, material)
    //   group.add(textmesh)
    // })
  }

  // ----------------------------------
  // animation
  private anime = () => {
    controls.update()
    gl.render()
  }

  private setCameraMovingStatus(value: boolean) {
    this.isCameraMoving = value
  }

  private animateCanvasRotation(canvasMesh: THREE.Mesh<THREE.BoxGeometry, (THREE.ShaderMaterial | THREE.MeshBasicMaterial)[], THREE.Object3DEventMap>) {
    const animate = () => {
      if (!this.isCameraMoving) {
        canvasMesh.rotation.y += 0.01 // Adjust the rotation speed as needed
        gl.render()
        requestAnimationFrame(animate)
      }
    }
    animate()
  }

  // Function to control camera movement
  private handleCameraMovement() {
    controls.primitive.addEventListener('change', () => {
      if (this.isFirstChangeIgnored) {
        this.setCameraMovingStatus(true)
      } else {
        this.isFirstChangeIgnored = true
      }
    })
  }

  // Function to toggle between solid and wireframe meshes
  private toggleMeshDisplay(canvasMesh: THREE.Mesh, wireframe: THREE.LineSegments) {
    let isWireframe = false

    const toggle = () => {
      isWireframe = !isWireframe
      if (isWireframe) {
        wireframe.position.copy(canvasMesh.position)
        wireframe.rotation.copy(canvasMesh.rotation)
        wireframe.scale.copy(canvasMesh.scale)
        wireframe.updateMatrix()
        gl.scene.remove(canvasMesh)
        gl.scene.add(wireframe)
      } else {
        gl.scene.remove(wireframe)
        gl.scene.add(canvasMesh)
      }
    }

    // Function to intermittently toggle between solid and wireframe
    const glitchAnimation = () => {
      const duration = Math.random() * 10000 // Randomize the duration between glitches (lower values for faster flicker)
      setTimeout(() => {
        toggle()
        setTimeout(() => {
          toggle()
          glitchAnimation() // Loop the glitch animation
        }, Math.random() * 10) // Flicker duration (lower values for faster flicker)
      }, duration) // Duration between flickers (higher values for less frequent flickers)
    }

    glitchAnimation() // Start the glitch animation
  }

  // ----------------------------------
  // dispose
  dispose() {
    gl.dispose()
  }
}
