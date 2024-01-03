const devMode = false
const sliders = ['scale', 'ballSetNum', 'speed', 'opacity']
const params = {}

const p = new p5(
    p => {
        let canvas
        const colorBalls = []
        let img
        let images = []

        let maxSpeed = 5
        let ballSetNum = document.querySelector("#ballSetNum").value //3個で1セット
        let colorMode = Array.from(document.querySelectorAll("#colorMode input[type=radio]")).filter(option => option.checked)[0].value
        let defaultSize = 200
        let pixels = []

        p.preload = () => {
            images["vortex"] = p.loadImage("./images/image.png")
            images["atori"] = p.loadImage("./images/kuratoriatori.png")
        }

        /* 画像を変更したらしたら毎回行う */
        const changeImageRoutine = (selected) => {
            img = images[selected]
            const width = Math.min(window.innerWidth, 512)
            img.resize(width, 0)
            img.loadPixels()
            pixels = img.pixels
            canvas = p.createCanvas(width, img.height / img.width * width)
            canvas.parent("canvasContainer")
        }


        p.setup = () => {
            p.pixelDensity(1)
            p.setFrameRate(60)

            const imageSelectOptions = Array.from(document.querySelectorAll("#imageSelect input[type=radio]"))
            const selected = imageSelectOptions.filter(option => option.checked)[0].value
            changeImageRoutine(selected)

            //RGBそれぞれ同数ずつ生成する
            for (let i = 0; i < ballSetNum; i++) {
                colorBalls.push(new ColorBall([255, 0, 0]))
                colorBalls.push(new ColorBall([0, 255, 0]))
                colorBalls.push(new ColorBall([0, 0, 255]))
            }

            // モード変更用イベントリスナを登録
            document.querySelector("#colorMode").addEventListener("change", e => {
                colorMode = e.target.value
            })
            // 画像切り替え
            document.querySelector("#imageSelect").addEventListener("change", e => {
                const imageSelectOptions = Array.from(document.querySelectorAll("#imageSelect input[type=radio]"))
                const selected = imageSelectOptions.filter(option => option.checked)[0].value
                changeImageRoutine(selected)
            })

            /* ラベル初期化 */
            sliders.forEach(slider => {
                const sliderElement = document.getElementById(slider)
                const labelElement = document.getElementById(`${slider}Label`)
                /* ラベル書き換え用 */
                sliderElement.addEventListener("input", e => {
                    labelElement.innerText = `${slider}: \n${sliderElement.value}`
                    params[slider] = sliderElement.value
                })
                /* 初期化 */
                sliderElement.dispatchEvent(new Event("input"))
            })

            /* ファイル選択 */
            const handleFile = (e) => {
                const file = e.target.files[0]
                if (file && file.type.startsWith('image/')) {
                    images["user"] = p.loadImage(URL.createObjectURL(file),
                        () => {
                            // ラジオボタンジャマーキャンセラー
                            document.querySelector("#imageSelect>[name=image][value=user]").disabled = false
                        })
                } else {
                    console.log("Something went wrong.")
                }
            }
            const fileUploadElement = document.querySelector("#fileUpload")
            fileUploadElement.addEventListener('change', handleFile)

            // GIF保存ボタン
            document.querySelector("#gifSave05").addEventListener("click", e => {
                p.saveGif('savedGIF.gif', 0.5, { delay: 3 })
            })
            document.querySelector("#gifSave1").addEventListener("click", e => {
                p.saveGif('savedGIF.gif', 1, { delay: 3 })
            })
            document.querySelector("#gifSave3").addEventListener("click", e => {
                p.saveGif('savedGIF.gif', 3, { delay: 3 })
            })

            p.background(0)
        }

        p.draw = () => {
            p.blendMode(p.BLEND)
            if (document.querySelector("#trace").checked) {
                p.background(16, 8)
            } else {
                p.background(16)
            }
            if (devMode) {
                p.text(p.frameRate().toFixed(2), 10, 10)
            }

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

            // ボールを更新
            colorBalls.forEach(ball => ball.update())

            // ボールを描画
            p.noStroke()
            p.ellipseMode(p.RADIUS)
            const blendMode = Array.from(document.querySelectorAll("#blendMode input[type=radio]")).filter(option => option.checked)[0].value
            p.blendMode(p[blendMode])
            colorBalls.forEach(ball => ball.draw())
        }

        class ColorBall {
            constructor(color) {
                this.initialColor = color
                this.color = p.color(this.initialColor)
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
                // 速度のバッファを更新
                this.velocityBuffer = { ...this.velocity }

                // 速度をスケール
                this.velocity[0] *= params.speed
                this.velocity[1] *= params.speed

                // 位置を更新
                this.position[0] += this.velocity[0]
                this.position[1] += this.velocity[1]
                //画面端で跳ね返る
                if (this.position[0] < 0 || this.position[0] > p.width) {
                    this.position[0] = this.position[0] < 0 ? 0 : p.width
                    this.velocityBuffer[0] *= -1
                }
                if (this.position[1] < 0 || this.position[1] > p.height) {
                    this.position[1] = this.position[1] < 0 ? 0 : p.height
                    this.velocityBuffer[1] *= -1
                }

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
                if (colorMode == "rgb") {
                    // 色は初期のR/G/Bに戻す
                    this.color = p.color(this.initialColor)

                    /* サイズを更新 */
                    // 自身の色
                    const which = this.initialColor.indexOf(Math.max(...this.initialColor))
                    // サイズに反映
                    this.size = [r, g, b][which]
                    this.sizeBuffer = this.size
                    this.size *= params.scale * 100 / 255 // lightnessの方とレンジが違う気がするんだよな…
                } else if (colorMode == "full") {
                    // 現在位置の画素の色を取得
                    this.color = p.color(r, g, b)
                    //デフォルトのサイズを使う
                    this.size = defaultSize
                    this.size *= params.scale
                } else if (colorMode == "lightness") {
                    this.color = p.color(255)
                    // 色の明度を取得
                    const lightness = p.lightness(p.color(r, g, b))
                    // サイズに反映
                    this.size = lightness
                    this.sizeBuffer = this.size
                    this.size *= params.scale
                }
            }

            draw() {
                // 色を設定
                this.color.setAlpha(params.opacity)
                p.fill(this.color)
                // 円を描画
                p.ellipse(this.position[0], this.position[1], this.size)
            }
        }
    }
)

