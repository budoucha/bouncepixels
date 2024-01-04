const devMode = false
const sliders = ['scale', 'ballSets', 'speed', 'opacity']
const radios = ['colorMode', 'blendMode', 'selectedImage']
const params = {}

const p = new p5(
    p => {
        let canvas
        const colorBalls = []
        let img
        let images = []
        let pixels = []

        let maxSpeed = 5
        let defaultSize = 200

        p.preload = () => {
            images["vortex"] = p.loadImage("./images/image.png")
            images["atori"] = p.loadImage("./images/kuratoriatori.png")
        }

        p.setup = () => {
            p.pixelDensity(1)
            p.setFrameRate(60)

            /* ラジオボタン共通処理 */
            radios.forEach(radio => {
                const radioElement = document.querySelector(`#${radio}`)
                radioElement.addEventListener("change", e => {
                    const options = Array.from(document.querySelectorAll(`#${radio} input[type=radio]`))
                    params[radio] = options.filter(option => option.checked)[0].value
                })
                // 初期化
                radioElement.dispatchEvent(new Event("change"))
            })
            // 画像切り替え時はchangeImageRoutineを呼ぶ
            document.querySelector("#selectedImage").addEventListener("change", changeImageRoutine)
            changeImageRoutine()

            /* スライダ共通処理 */
            sliders.forEach(slider => {
                const sliderElement = document.getElementById(slider)
                const labelElement = document.getElementById(`${slider}Label`)
                // 更新時
                sliderElement.addEventListener("input", e => {
                    labelElement.innerText = `${slider}: \n${sliderElement.value}`
                    params[slider] = sliderElement.value
                })
                // 初期化
                sliderElement.dispatchEvent(new Event("input"))
            })
            // 個数のみ更新時に再初期化する
            document.querySelector("#ballSets").addEventListener("input", setColorBalls)
            setColorBalls()


            /* ファイル選択 */
            const handleFile = (e) => {
                const file = e.target.files[0]
                if (file && file.type.startsWith('image/')) {
                    images["user"] = p.loadImage(URL.createObjectURL(file),
                        () => {
                            // ラジオボタンジャマーキャンセラー
                            document.querySelector("#selectedImage>[name=image][value=user]").disabled = false
                        })
                } else {
                    console.log("Something went wrong.")
                }
            }
            const fileSelectElement = document.querySelector("#fileSelect")
            fileSelectElement.addEventListener('change', handleFile)

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
                p.textSize(20)
                p.text(p.frameRate().toFixed(2), 10, 20)
            }


            // ボールを更新
            colorBalls.forEach(ball => ball.update())

            // ボールを描画
            p.noStroke()
            p.ellipseMode(p.RADIUS)
            p.blendMode(p[params.blendMode])
            colorBalls.forEach(ball => ball.draw())
        }

        /* 画像を変更したらしたら毎回行う */
        const changeImageRoutine = () => {
            img = images[params.selectedImage]
            const width = Math.min(window.innerWidth, 512)
            img.resize(width, 0)
            img.loadPixels()
            pixels = img.pixels
            canvas = p.createCanvas(width, img.height / img.width * width)
            canvas.parent("canvasContainer")
        }

        const setColorBalls = () => {
            // RGBそれぞれ同数ずつ生成する
            // 指定よりすくなければ追加  多ければ後ろから削除
            if (params.ballSets * 3 > colorBalls.length) {
                for (let i = 0; i < params.ballSets * 3 - colorBalls.length; i++) {
                    colorBalls.push(new ColorBall([255, 0, 0]))
                    colorBalls.push(new ColorBall([0, 255, 0]))
                    colorBalls.push(new ColorBall([0, 0, 255]))
                }
            } else if (params.ballSets * 3 < colorBalls.length) {
                colorBalls.splice(params.ballSets * 3)
            }
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

                const positionInt = [] // 色取得用に整数化した座標

                for (let i = 0; i < 2; i++) {
                    // 速度をスケール
                    this.velocity[i] *= params.speed
                    // 位置を更新
                    this.position[i] += this.velocity[i]
                    //画面端で跳ね返る
                    const canvasSize = [p.width, p.height]
                    if (this.position[i] < 0 || this.position[i] > canvasSize[i]) {
                        this.position[i] = this.position[i] < 0 ? 0 : canvasSize[i]
                        this.velocityBuffer[i] *= -1
                    }

                    positionInt[i] = Math.round(this.position[i])
                }

                // 位置の画素の色の対応する原色値を取得
                const pos2index = (x, y) => { return (x + y * img.width) * 4 }
                const pixelIndex = pos2index(positionInt[0], positionInt[1])
                const [r, g, b] = [
                    pixels[pixelIndex],
                    pixels[pixelIndex + 1],
                    pixels[pixelIndex + 2],
                ]

                /* モードごとの処理 */
                if (params.colorMode == "rgb") {
                    // 色は初期のR/G/Bに戻す
                    this.color = p.color(this.initialColor)

                    /* サイズを更新 */
                    // 自身の色
                    const which = this.initialColor.indexOf(Math.max(...this.initialColor))
                    // サイズに反映
                    this.size = [r, g, b][which]
                } else if (params.colorMode == "full") {
                    // 現在位置の画素の色を取得
                    this.color = p.color(r, g, b)
                    //デフォルトのサイズをなんちゃって正規化して使う
                    this.size = defaultSize / 1.4
                } else if (params.colorMode == "lightness") {
                    this.color = p.color(255)
                    // 色の明度を取得
                    const lightness = p.lightness(p.color(r, g, b))
                    // サイズに反映
                    this.size = lightness * 255 / 100 //おそらく他とレンジが違う
                }
                this.sizeBuffer = this.size
                this.size *= params.scale / 100
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

