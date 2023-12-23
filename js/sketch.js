const p = new p5(
    p => {
        const colorBalls = []
        let img
        let images = []

        let scale = 0.04
        let maxSpeed = 5
        let speed = 1
        let ballSetNum = 1024 //3個で1セット
        let mode = "lightness"
        let applyLuminance = document.querySelector("#applyLuminance").checked
        const luminance = [0.2126, 0.7152, 0.0722]
        let luminanceScale = 1.25
        let defaultSize = 200
        let pixels = []

        p.preload = () => {
            images["vortex"] = p.loadImage("./images/image.png")
            images["atori"] = p.loadImage("./images/kuratoriatori.png")
        }

        p.setup = () => {
            const imageSelectOptions = Array.from(document.querySelectorAll("#imageSelect input[type=radio]"))
            const selected = imageSelectOptions.filter(option => option.checked)[0].value
            img = images[selected]

            const width = Math.min(window.innerWidth, 640)
            const canvas = p.createCanvas(width, img.height / img.width * width)
            canvas.parent("canvasContainer")
            p.pixelDensity(1)
            p.setFrameRate(60)


            img.resize(p.width, 0)
            img.loadPixels()
            pixels = img.pixels

            //RGBそれぞれ同数ずつ生成する
            for (let i = 0; i < ballSetNum; i++) {
                colorBalls.push(new ColorBall([255, 0, 0]))
                colorBalls.push(new ColorBall([0, 255, 0]))
                colorBalls.push(new ColorBall([0, 0, 255]))
            }

            // モード変更用イベントリスナを登録
            document.querySelector("#modeSwitch").addEventListener("change", e => {
                mode = e.target.value
            })
            // 輝度モード用イベントリスナを登録
            document.querySelector("#applyLuminance").addEventListener("change", e => {
                applyLuminance = document.querySelector("#applyLuminance").checked
                console.log(`applyLuminance: ${applyLuminance}`)
            })
            // 画像切り替え
            document.querySelector("#imageSelect").addEventListener("change", e => {
                const imageSelectOptions = Array.from(document.querySelectorAll("#imageSelect input[type=radio]"))
                const selected = imageSelectOptions.filter(option => option.checked)[0].value
                img = images[selected]
                img.resize(p.width, 0)
                img.loadPixels()
                pixels = img.pixels
            })

            const scaleElement = document.getElementById("scale")
            const scaleLabelElement = document.getElementById("scaleLabel")
            scaleLabelElement.innerText = `ballSize: \n${scaleElement.value}`

            const ballSetNumElement = document.getElementById("ballSetNum")
            const ballSetNumLabelElement = document.getElementById("ballSetNumLabel")
            ballSetNumLabelElement.innerText = `ballSetNum: \n${ballSetNumElement.value}`

            const speedElement = document.getElementById("speed")
            const speedLabelElement = document.getElementById("speedLabel")
            speedLabelElement.innerText = `speed: \n${speedElement.value}`
        }

        p.draw = () => {
            p.background(16)
            if (p.frameCount % 60 == 0) {
                console.log(`fps: ${p.frameRate()}`)
            }

            //  p.image(img, 0, 0);

            // ボール数を更新
            ballSetNum = document.querySelector("#ballSetNum").value
            //現在より多ければ追加  少なければ後ろから削除
            if (ballSetNum * 3 > colorBalls.length) {
                for (let i = 0; i < ballSetNum * 3 - colorBalls.length; i++) {
                    colorBalls.push(new ColorBall([255, 0, 0]))
                    colorBalls.push(new ColorBall([0, 255, 0]))
                    colorBalls.push(new ColorBall([0, 0, 255]))
                }
            } else if (ballSetNum * 3 < colorBalls.length) {
                colorBalls.splice(ballSetNum * 3)
            }

            // 速度を更新
            speed = document.querySelector("#speed").value

            // ボールを更新
            colorBalls.forEach(ball => ball.update())

            // ボールを描画
            p.noStroke()
            p.ellipseMode(p.RADIUS)
            colorBalls.forEach(ball => ball.draw())
        }

        class ColorBall {
            constructor(color) {
                this.initialColor = color
                this.color = this.initialColor
                // キャンバス内のランダムな位置に配置
                this.position = [Math.random() * p.width, Math.random() * p.height]
                // ランダムな初速を与える
                this.velocity = [Math.random() * maxSpeed - maxSpeed / 2, Math.random() * maxSpeed - maxSpeed / 2]
                // 速度のバッファ 参照渡しにならないよう注意
                this.velocityBuffer = { ...this.velocity }
                // 初期サイズ
                this.size = defaultSize
                this.sizeBuffer = this.size
            }
            update() {
                /* 共通処理 */
                this.velocity = { ...this.velocityBuffer }
                //画面端で跳ね返る
                if (this.position[0] < 0 || this.position[0] > p.width) {
                    this.velocity[0] *= -1
                }
                if (this.position[1] < 0 || this.position[1] > p.height) {
                    this.velocity[1] *= -1
                }
                // 速度のバッファを更新
                this.velocityBuffer = { ...this.velocity }

                // 速度をスケール
                this.velocity[0] *= speed
                this.velocity[1] *= speed

                // 位置を更新
                this.position[0] += this.velocity[0]
                this.position[1] += this.velocity[1]

                // 色取得用
                const positionIntX = Math.round(this.position[0])
                const positionIntY = Math.round(this.position[1])

                // 位置の画素の色の対応する原色値を取得
                const pos2index = (x, y) => { return (x + y * img.width) * 4 }
                const pixelIndex = pos2index(positionIntX, positionIntY)
                const [r, g, b] = [
                    pixels[pixelIndex],
                    pixels[pixelIndex + 1],
                    pixels[pixelIndex + 2],
                ]

                /* モードごとの処理 */
                if (mode == "rgb") {
                    // 色は初期のR/G/Bに戻す
                    this.color = this.initialColor

                    /* サイズを更新 */
                    // 自身の色
                    const which = this.initialColor.indexOf(Math.max(...this.initialColor))
                    // サイズに反映
                    this.size = applyLuminance ?
                        // [r, g, b][which] * Math.sqrt((1/luminance[which])) * luminanceScale :
                        [r, g, b][which] * Math.sqrt(1 - luminance[which]) * luminanceScale :
                        [r, g, b][which]

                    this.sizeBuffer = this.size
                    scale = document.getElementById("scale").value
                    this.size *= scale * 100/255 // lightnessの方とレンジが違う気がするんだよな…
                } else if (mode == "full") {
                    // 現在位置の画素の色を取得
                    this.color = p.color(r, g, b)
                    //保存されたサイズを使う
                    this.size = this.sizeBuffer
                    scale = document.getElementById("scale").value
                    this.size *= scale
                } else if (mode == "lightness") {
                    this.color = p.color(255)
                    // 色の明度を取得
                    const lightness = p.lightness(p.color(r, g, b))
                    // サイズに反映
                    this.size = lightness
                    this.sizeBuffer = this.size
                    scale = document.getElementById("scale").value
                    this.size *= scale
                }
                else if (mode == "brightness") {
                    this.color = p.color(255)
                    // 色の明度を取得
                    const brightness = p.brightness(p.color(r, g, b))
                    // サイズに反映
                    this.size = brightness
                    this.sizeBuffer = this.size
                    scale = document.getElementById("scale").value
                    this.size *= scale
                }

            }

            draw() {
                // 色を設定
                p.fill(this.color)
                // 円を描画
                p.ellipse(this.position[0], this.position[1], this.size)
            }
        }
    }
)

/* ラベル書き換え用 */
const scaleElement = document.getElementById("scale")
const scaleLabelElement = document.getElementById("scaleLabel")
scaleElement.addEventListener("input", e => {
    scaleLabelElement.innerText = `ballSize: \n${scaleElement.value}`
})

const ballSetNumElement = document.getElementById("ballSetNum")
const ballSetNumLabelElement = document.getElementById("ballSetNumLabel")
ballSetNumElement.addEventListener("input", e => {
    ballSetNumLabelElement.innerText = `ballSetNum: \n${ballSetNumElement.value}`
})

const speedElement = document.getElementById("speed")
const speedLabelElement = document.getElementById("speedLabel")
speedElement.addEventListener("input", e => {
    speedLabelElement.innerText = `speed: \n${speedElement.value}`
})
