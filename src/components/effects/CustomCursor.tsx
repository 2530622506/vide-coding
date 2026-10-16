import { useEffect, useState, useRef } from 'react'
import { motion, useMotionValue, useSpring, AnimatePresence } from 'motion/react'

interface Particle {
  id: number
  x: number
  y: number
  angle: number
  velocity: number
}

export function CustomCursor() {
  const [isHovering, setIsHovering] = useState(false)
  const [isClicking, setIsClicking] = useState(false)
  const [particles, setParticles] = useState<Particle[]>([])
  const [trails, setTrails] = useState<{ x: number; y: number; id: number }[]>([])

  const cursorX = useMotionValue(0)
  const cursorY = useMotionValue(0)

  // 更柔和的弹簧配置
  const springConfig = { damping: 30, stiffness: 300, mass: 0.8 }
  const cursorXSpring = useSpring(cursorX, springConfig)
  const cursorYSpring = useSpring(cursorY, springConfig)

  const trailIdRef = useRef(0)

  useEffect(() => {
    const moveCursor = (e: MouseEvent) => {
      cursorX.set(e.clientX)
      cursorY.set(e.clientY)

      // 轨迹效果
      const newTrail = { x: e.clientX, y: e.clientY, id: trailIdRef.current++ }
      setTrails(prev => [...prev.slice(-12), newTrail])
    }

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (
        target.tagName === 'A' ||
        target.tagName === 'BUTTON' ||
        target.closest('a') ||
        target.closest('button') ||
        target.style.cursor === 'pointer'
      ) {
        setIsHovering(true)
      } else {
        setIsHovering(false)
      }
    }

    const handleMouseDown = () => {
      setIsClicking(true)
    }

    const handleMouseUp = () => {
      setIsClicking(false)
    }

    const handleClick = (e: MouseEvent) => {
      // 点击粒子爆炸
      const newParticles: Particle[] = []
      const particleCount = 16

      for (let i = 0; i < particleCount; i++) {
        newParticles.push({
          id: Date.now() + i,
          x: e.clientX,
          y: e.clientY,
          angle: (Math.PI * 2 * i) / particleCount,
          velocity: 2 + Math.random() * 4,
        })
      }

      setParticles(prev => [...prev, ...newParticles])

      setTimeout(() => {
        setParticles(prev => prev.filter(p => !newParticles.includes(p)))
      }, 1200)
    }

    window.addEventListener('mousemove', moveCursor)
    window.addEventListener('mouseover', handleMouseOver)
    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('click', handleClick)

    return () => {
      window.removeEventListener('mousemove', moveCursor)
      window.removeEventListener('mouseover', handleMouseOver)
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('click', handleClick)
    }
  }, [cursorX, cursorY])

  return (
    <>
      {/* 隐藏默认光标 */}
      <style>{`
        * {
          cursor: none !important;
        }
      `}</style>

      {/* 轨迹拖尾效果 */}
      <AnimatePresence>
        {trails.map((trail, index) => (
          <motion.div
            key={trail.id}
            className="fixed pointer-events-none z-[9997] rounded-full"
            style={{
              left: trail.x,
              top: trail.y,
              width: 6,
              height: 6,
              background: `rgba(191, 160, 148, ${0.4 * (index / trails.length)})`,
              transform: 'translate(-50%, -50%)',
            }}
            initial={{ scale: 1, opacity: 0.8 }}
            animate={{ scale: 0.2, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        ))}
      </AnimatePresence>

      {/* 外层大光晕 - 始终存在 */}
      <motion.div
        className="fixed pointer-events-none z-[9998] rounded-full"
        style={{
          left: cursorXSpring,
          top: cursorYSpring,
          transform: 'translate(-50%, -50%)',
        }}
        animate={{
          width: isHovering ? 100 : 70,
          height: isHovering ? 100 : 70,
          background: isHovering
            ? 'radial-gradient(circle, rgba(191, 160, 148, 0.25) 0%, rgba(191, 160, 148, 0.1) 40%, rgba(191, 160, 148, 0) 70%)'
            : 'radial-gradient(circle, rgba(191, 160, 148, 0.15) 0%, rgba(191, 160, 148, 0.05) 40%, rgba(191, 160, 148, 0) 70%)',
        }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      />

      {/* 悬停扩散波纹 - 三层叠加 */}
      {isHovering && (
        <>
          <motion.div
            className="fixed pointer-events-none z-[9998] rounded-full"
            style={{
              left: cursorXSpring,
              top: cursorYSpring,
              transform: 'translate(-50%, -50%)',
              background: 'radial-gradient(circle, rgba(191, 160, 148, 0.2) 0%, rgba(191, 160, 148, 0) 60%)',
            }}
            initial={{ width: 60, height: 60, opacity: 0.8 }}
            animate={{
              width: 140,
              height: 140,
              opacity: 0,
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeOut',
            }}
          />
          <motion.div
            className="fixed pointer-events-none z-[9998] rounded-full"
            style={{
              left: cursorXSpring,
              top: cursorYSpring,
              transform: 'translate(-50%, -50%)',
              background: 'radial-gradient(circle, rgba(191, 160, 148, 0.15) 0%, rgba(191, 160, 148, 0) 60%)',
            }}
            initial={{ width: 60, height: 60, opacity: 0.6 }}
            animate={{
              width: 170,
              height: 170,
              opacity: 0,
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeOut',
              delay: 0.5,
            }}
          />
          <motion.div
            className="fixed pointer-events-none z-[9999] rounded-full border border-primary-300/40"
            style={{
              left: cursorXSpring,
              top: cursorYSpring,
              transform: 'translate(-50%, -50%)',
            }}
            initial={{ width: 50, height: 50, opacity: 0.8 }}
            animate={{
              width: 120,
              height: 120,
              opacity: 0,
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: 'easeOut',
            }}
          />
        </>
      )}

      {/* 主光标环 */}
      <motion.div
        className="fixed pointer-events-none z-[9999] rounded-full border-2"
        style={{
          left: cursorXSpring,
          top: cursorYSpring,
          transform: 'translate(-50%, -50%)',
        }}
        animate={{
          width: isClicking ? 20 : isHovering ? 56 : 32,
          height: isClicking ? 20 : isHovering ? 56 : 32,
          borderColor: isHovering ? 'rgba(191, 160, 148, 0.8)' : 'rgba(191, 160, 148, 0.5)',
        }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
      />

      {/* 内部圆点 */}
      <motion.div
        className="fixed pointer-events-none z-[9999] rounded-full"
        style={{
          left: cursorX,
          top: cursorY,
          transform: 'translate(-50%, -50%)',
          background: isHovering
            ? 'rgba(191, 160, 148, 1)'
            : 'rgba(191, 160, 148, 0.8)',
        }}
        animate={{
          width: isClicking ? 6 : 10,
          height: isClicking ? 6 : 10,
        }}
        transition={{ duration: 0.1 }}
      />

      {/* 点击粒子爆炸 */}
      <AnimatePresence>
        {particles.map(particle => (
          <motion.div
            key={particle.id}
            className="fixed pointer-events-none z-[9999] rounded-full"
            style={{
              background: 'rgba(191, 160, 148, 0.8)',
            }}
            initial={{
              x: particle.x,
              y: particle.y,
              width: 4,
              height: 4,
              scale: 1,
              opacity: 1,
            }}
            animate={{
              x: particle.x + Math.cos(particle.angle) * 120 * particle.velocity,
              y: particle.y + Math.sin(particle.angle) * 120 * particle.velocity,
              scale: 0,
              opacity: 0,
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 1.2,
              ease: 'easeOut',
            }}
          />
        ))}
      </AnimatePresence>
    </>
  )
}
