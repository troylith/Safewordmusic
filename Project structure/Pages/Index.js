import Head from 'next/head'
import styles from '../styles/Home.module.css'

export default function Home() {
  return (
    <div className={styles.container}>
      <Head>
        <title>Safewørd</title>
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>Welcome to Safewørd</h1>
        <p className={styles.description}>Dark. Clean. Real.</p>
        <a href="https://instagram.com" target="_blank" className={styles.button}>Follow on Instagram</a>
      </main>
    </div>
  )
}
