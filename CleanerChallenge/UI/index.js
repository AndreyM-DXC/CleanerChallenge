
const dust = document.getElementById('dust').getContext("2d", { willReadFrequently: true })

function mulberry32(a) {
    return function () {
        var t = a += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

class Robot {
    constructor(x, y) {
        this.x = x
        this.y = y
        this.a = 0
        this.dom = document.getElementById('robot')
    }

    draw() {
        dust.beginPath()
        dust.arc(this.x, this.y, 32, 0, 2 * Math.PI)
        dust.fillStyle = '#fff';
        dust.fill();

        this.dom.style.transform = `translate(${this.x}px, ${this.y}px) rotate(${this.a}rad)`
    }

    collect(socks) {
        const R2 = 24 * 24
        let count = 0

        for (let i = socks.length; i-- > 0;) {
            const dx = this.x - socks[i].x
            const dy = this.y - socks[i].y
            if (dx * dx + dy * dy <= R2) {
                socks[i].dom.remove()
                socks.splice(i, 1)
                count++
                console.log("EAT")
            }
        }
        return count
    }

    collides(x, y) {
        const data = dust.getImageData(x - 33, y - 33, 66, 66).data
        const R2 = 33 * 33
        for (let i = -33, idx = 0; i < 33; i++) {
            for (let j = -33; j < 33; j++, idx += 4) {
                if (data[idx] == 0 && i * i + j * j < R2) {
                    return true
                }
            }
        }
        return false
    }

    moveTo = function* (x, y) {
        x = Math.floor(x)
        y = Math.floor(y)

        const ta = Math.atan2(y - this.y, x - this.x)
        const dx = Math.abs(x - this.x)
        const sx = this.x < x ? 1 : -1
        const dy = -Math.abs(y - this.y)
        const sy = this.y < y ? 1 : -1
        let error = dx + dy

        while (true) {
            this.draw()
            this.a += (ta - this.a) * 0.1

            if (this.x == x && this.y == y) {
                break
            }
            const e2 = error * 2
            if (e2 >= dy) {
                if (this.x == x) {
                    break
                }
                if (this.collides(this.x + sx, this.y)) {
                    break;
                }
                error += dy
                this.x += sx
            }
            if (e2 <= dx) {
                if (this.y == y) {
                    break
                }
                if (this.collides(this.x, this.y + sy)) {
                    break;
                }
                error += dx
                this.y += sy
            }
            yield
        }
    }
}

class Room {
    constructor(seed, count) {
        const overlay = document.getElementById('overlay')
        const socks = document.getElementById('socks')
        const random = mulberry32(seed)

        dust.fillStyle = '#010000'
        dust.fillRect(0, 0, 1280, 800)

        dust.globalCompositeOperation = 'destination-out'
        dust.drawImage(overlay, 0, 0, 1280, 800)
        dust.globalCompositeOperation = 'source-over'

        const data = dust.getImageData(0, 0, 1280, 800).data

        this.socks = []
        while (this.socks.length < count) {
            const x = Math.floor(random() * 1200 + 40)
            const y = Math.floor(random() * 700 + 50)
            const idx = (y * 1280 + x) * 4

            if (data[idx] > 0) {
                const dom = document.createElement('img')
                dom.classList.add('sock')
                dom.width = dom.height = 32
                dom.src = 'socks.png'
                dom.style.transform = `translate(${x}px, ${y}px) rotate(${Math.random() * 360}deg)`
                socks.appendChild(dom)
                this.socks.push({ x, y, dom })
            }
        }
    }
}

class Timer {
    constructor(seconds) {
        this.timeout = seconds * 60
        this.dt = 1
    }

    toString() {
        const min = Math.floor(this.timeout / 60 / 60)
        const sec = Math.floor(this.timeout / 60 % 60)
        return sec < 10 ? `${min}:0${sec}` : `${min}:${sec}`
    }

    tick() {
        return (this.timeout -= this.dt) > 0
    }

    frame() {
        return new Promise(resolve => requestAnimationFrame(resolve))
    }
}

async function RunGame() {
    const score = document.getElementById('score')
    const time = document.getElementById('time')
    const robot = new Robot(100, 200)
    const room = new Room(123, 21)
    const timer = new Timer(5 * 60)

    function calcScore() {
        const data = dust.getImageData(0, 0, 1280, 800).data
        let score = 0
        for (let i = 0; i < data.length; i += 4) {
            score += data[i] / 255
        }
        return Math.ceil(score)
    }

    function createState() {
        const data = dust.getImageData(0, 0, 1280, 800).data
        const d = new Array(data.length / 4)
        for (let i = 0; i < d.length; i++) {
            d[i] = String.fromCharCode(data[i * 4])
        }
        return {
            score: calcScore(),
            dust: btoa(d.join('')),
            robot: { x: robot.x, y: robot.y },
            socks: room.socks.map(sock => ({ x: sock.x, y: sock.y }))
        }
    }

    while (true) {
        try {
            const state = createState()
            const response = await fetch('/api/next', {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                method: 'POST',
                body: JSON.stringify(state)
            })
            const command = await response.json()

            score.innerText = state.score
            time.innerText = timer.toString()

            const it = robot.moveTo(command.x, command.y)
            for (let step = it.next(); !step.done; step = it.next()) {
                const collected = robot.collect(room.socks)
                if (collected > 0) {
                    timer.dt += collected * 0.1
                }
                if (!timer.tick()) {
                    score.innerText = calcScore()
                    time.innerText = '0:00'
                    return
                }
                if (!command.fast) {
                    score.innerText = calcScore()
                    time.innerText = timer.toString()
                    await timer.frame()
                }
            }
        }
        catch (e) {
            console.error(e)
        }
    }
}

const overlay = document.getElementById('overlay')
overlay.complete ? RunGame() : (overlay.onload = RunGame)
