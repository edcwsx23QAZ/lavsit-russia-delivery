'use client'

import { useState } from 'react'
import Link from 'next/link'
import styles from './wiki.module.css'

export default function WikiPage() {
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [scripts, setScripts] = useState([
    {
      id: 1,
      title: 'Приветствие клиента',
      text: 'Добрый день! Меня зовут [Имя], я ваш менеджер по логистике. Готов помочь с организацией доставки вашего заказа.',
      category: 'Общение'
    },
    {
      id: 2,
      title: 'Уточнение адреса доставки',
      text: 'Для оформления доставки мне необходимо уточнить точный адрес и удобное время. Когда вам будет удобно принять заказ?',
      category: 'Оформление'
    }
  ])

  const toggleSection = (section: string) => {
    setActiveSection(activeSection === section ? null : section)
  }

  const addScript = () => {
    const newScript = {
      id: scripts.length + 1,
      title: 'Новый скрипт',
      text: 'Текст скрипта...',
      category: 'Общение'
    }
    setScripts([...scripts, newScript])
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href="/" className={styles.backLink}>← На главную</Link>
        <h1 className={styles.title}>Инструкция для менеджера по логистике</h1>
      </header>

      <div className={styles.content}>
        <aside className={styles.sidebar}>
          <nav className={styles.nav}>
            <a href="#introduction" className={styles.navItem}>1. Введение</a>
            <a href="#schedule" className={styles.navItem}>2. Расписание</a>
            <a href="#tools" className={styles.navItem}>3. Инструменты</a>
            <a href="#processes" className={styles.navItem}>4. Процессы</a>
            <a href="#standards" className={styles.navItem}>5. Регламенты</a>
            <a href="#contacts" className={styles.navItem}>6. Контакты</a>
            <a href="#client-communication" className={styles.navItem}>7. Работа с клиентами</a>
            <a href="#scripts" className={styles.navItem}>8. Скрипты</a>
          </nav>
        </aside>

        <main className={styles.main}>
          {/* Введение */}
          <section id="introduction" className={styles.section}>
            <h2 className={styles.sectionTitle}>1. Введение</h2>
            
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Цель и важность работы</h3>
              <p className={styles.text}>
                Менеджер по логистике — ключевое звено в цепочке доставки премиум-мебели. 
                Ваша работа напрямую влияет на удовлетворенность клиентов и репутацию компании.
              </p>
              <p className={styles.text}>
                В компании действует <strong>клиентократия по Вкуссвиллу</strong> и <strong>AJTBD подход</strong> 
                (Always Just The Best Delivery). Это означает, что клиент всегда прав, и мы стремимся 
                предоставить лучший сервис доставки в отрасли.
              </p>
            </div>

            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Ценность для клиента</h3>
              <ul className={styles.list}>
                <li>✅ <strong>Безопасность и сохранность</strong> — гарантия целостности премиум-мебели при транспортировке</li>
                <li>✅ <strong>Прозрачность</strong> — полная информация о статусе доставки в реальном времени</li>
                <li>✅ <strong>Удобство</strong> — гибкое планирование доставки с учетом пожеланий клиента</li>
                <li>✅ <strong>Профессионализм</strong> — компетентное решение любых вопросов и проблем</li>
                <li>✅ <strong>Эксклюзивность</strong> — индивидуальный подход к каждому клиенту</li>
                <li>✅ <strong>Скорость реакции</strong> — оперативное решение вопросов и рекламаций</li>
              </ul>
            </div>

            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Общие принципы работы</h3>
              <ul className={styles.list}>
                <li>Клиент всегда в приоритете</li>
                <li>Проактивная коммуникация вместо реактивной</li>
                <li>Документирование всех операций</li>
                <li>Работа в команде и взаимопомощь</li>
                <li>Постоянное улучшение процессов</li>
              </ul>
            </div>
          </section>

          {/* Расписание */}
          <section id="schedule" className={styles.section}>
            <h2 className={styles.sectionTitle}>2. Расписание и рабочий день</h2>
            
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Типичное ежедневное расписание</h3>
              <div className={styles.schedule}>
                <div className={styles.scheduleItem}>
                  <span className={styles.time}>09:00 - 09:30</span>
                  <span className={styles.task}>Проверка новых заявок и отгрузок на день</span>
                </div>
                <div className={styles.scheduleItem}>
                  <span className={styles.time}>09:30 - 10:30</span>
                  <span className={styles.task}>Согласование отгрузок с производителями</span>
                </div>
                <div className={styles.scheduleItem}>
                  <span className={styles.time}>10:30 - 11:30</span>
                  <span className={styles.task}>Согласование со складом</span>
                </div>
                <div className={styles.scheduleItem}>
                  <span className={styles.time}>11:30 - 13:00</span>
                  <span className={styles.task}>Согласование с экспедиторами/сборщиками</span>
                </div>
                <div className={styles.scheduleItem}>
                  <span className={styles.time}>13:00 - 14:00</span>
                  <span className={styles.task}>Обед</span>
                </div>
                <div className={styles.scheduleItem}>
                  <span className={styles.time}>14:00 - 15:30</span>
                  <span className={styles.task}>Согласование с клиентами, работа с оплатами</span>
                </div>
                <div className={styles.scheduleItem}>
                  <span className={styles.time}>15:30 - 17:00</span>
                  <span className={styles.task}>Оформление заказов через ТК и прямые машины</span>
                </div>
                <div className={styles.scheduleItem}>
                  <span className={styles.time}>17:00 - 18:00</span>
                  <span className={styles.task}>Ведение учета, отчетность, обработка рекламаций</span>
                </div>
              </div>
            </div>

            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Критические временные точки</h3>
              <ul className={styles.list}>
                <li><strong>09:00</strong> — обязательная проверка всех заявок на день</li>
                <li><strong>12:00</strong> — все отгрузки должны быть согласованы</li>
                <li><strong>16:00</strong> — все заказы должны быть оформлены</li>
                <li><strong>18:00</strong> — отчеты должны быть готовы</li>
              </ul>
            </div>
          </section>

          {/* Инструменты */}
          <section id="tools" className={styles.section}>
            <h2 className={styles.sectionTitle}>3. Инструменты и системы</h2>
            
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>CRM и системы учета</h3>
              <div className={styles.toolGrid}>
                <div className={styles.toolCard}>
                  <h4>CRM система</h4>
                  <p><strong>Ссылка:</strong> <a href="#" className={styles.link}>crm.company.ru</a></p>
                  <p><strong>Логин:</strong> [ваш логин]</p>
                  <p><strong>Пароль:</strong> [хранится в менеджере паролей]</p>
                </div>
                <div className={styles.toolCard}>
                  <h4>Таск-менеджер</h4>
                  <p><strong>Ссылка:</strong> <a href="#" className={styles.link}>tasks.company.ru</a></p>
                  <p><strong>Логин:</strong> [ваш логин]</p>
                </div>
                <div className={styles.toolCard}>
                  <h4>Система учета платежей</h4>
                  <p><strong>Ссылка:</strong> <a href="#" className={styles.link}>payments.company.ru</a></p>
                  <p><strong>Логин:</strong> [ваш логин]</p>
                </div>
              </div>
            </div>

            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Транспортные платформы</h3>
              <div className={styles.toolGrid}>
                <div className={styles.toolCard}>
                  <h4>ТК Деловые Линии</h4>
                  <p><strong>Ссылка:</strong> <a href="https://www.dellin.ru" className={styles.link}>www.dellin.ru</a></p>
                  <p><strong>Логин:</strong> [логин компании]</p>
                </div>
                <div className={styles.toolCard}>
                  <h4>ТК ПЭК</h4>
                  <p><strong>Ссылка:</strong> <a href="https://www.pecom.ru" className={styles.link}>www.pecom.ru</a></p>
                  <p><strong>Логин:</strong> [логин компании]</p>
                </div>
                <div className={styles.toolCard}>
                  <h4>ТК СДЭК</h4>
                  <p><strong>Ссылка:</strong> <a href="https://www.cdek.ru" className={styles.link}>www.cdek.ru</a></p>
                  <p><strong>Логин:</strong> [логин компании]</p>
                </div>
                <div className={styles.toolCard}>
                  <h4>Прямые машины</h4>
                  <p><strong>Контакты:</strong> [телефон диспетчера]</p>
                  <p><strong>Чат:</strong> [ссылка на чат]</p>
                </div>
              </div>
            </div>

            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Чаты и коммуникации</h3>
              <ul className={styles.list}>
                <li><strong>Общий чат отдела:</strong> [ссылка на Telegram/WhatsApp]</li>
                <li><strong>Чат с производителями:</strong> [ссылка]</li>
                <li><strong>Чат со складом:</strong> [ссылка]</li>
                <li><strong>Чат с экспедиторами:</strong> [ссылка]</li>
                <li><strong>Чат с клиентами (премиум):</strong> [ссылка]</li>
              </ul>
            </div>
          </section>

          {/* Процессы */}
          <section id="processes" className={styles.section}>
            <h2 className={styles.sectionTitle}>4. Процессы и регламенты</h2>
            
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>4.1 Согласование отгрузок</h3>
              
              <div className={styles.processCard}>
                <h4>С производителями</h4>
                <ol className={styles.orderedList}>
                  <li>Проверить готовность заказа в CRM</li>
                  <li>Связаться с производителем в установленное время (09:30-10:30)</li>
                  <li>Уточнить сроки готовности и возможность отгрузки</li>
                  <li>Согласовать дату и время отгрузки</li>
                  <li>Зафиксировать в системе</li>
                </ol>
              </div>

              <div className={styles.processCard}>
                <h4>Со складом</h4>
                <ol className={styles.orderedList}>
                  <li>Проверить наличие товара на складе</li>
                  <li>Согласовать время приёмки</li>
                  <li>Уточнить условия хранения</li>
                  <li>Зафиксировать в системе</li>
                </ol>
              </div>

              <div className={styles.processCard}>
                <h4>С экспедиторами/сборщиками</h4>
                <ol className={styles.orderedList}>
                  <li>Согласовать маршрут и время</li>
                  <li>Уточнить необходимость сборки</li>
                  <li>Предоставить контакты клиента</li>
                  <li>Согласовать условия доставки</li>
                </ol>
              </div>

              <div className={styles.processCard}>
                <h4>С клиентами</h4>
                <ol className={styles.orderedList}>
                  <li>Связаться с клиентом заранее (минимум за 2 дня)</li>
                  <li>Предложить удобное время доставки</li>
                  <li>Уточнить адрес и условия доступа</li>
                  <li>Предупредить о необходимости присутствия</li>
                  <li>Подтвердить детали в письменном виде</li>
                </ol>
              </div>
            </div>

            <div className={styles.card}>
              <h3 className={styles.cardTitle}>4.2 Работа с оплатами</h3>
              
              <div className={styles.processCard}>
                <h4>Доплаты клиентов</h4>
                <ol className={styles.orderedList}>
                  <li>Рассчитать сумму доплаты</li>
                  <li>Связаться с клиентом и объяснить причину</li>
                  <li>Отправить реквизиты для оплаты</li>
                  <li>Подтвердить получение платежа</li>
                  <li>Зафиксировать в системе учета</li>
                </ol>
              </div>

              <div className={styles.processCard}>
                <h4>Оплата за платное хранение</h4>
                <ol className={styles.orderedList}>
                  <li>Рассчитать стоимость хранения (по тарифам)</li>
                  <li>Уведомить клиента о необходимости оплаты</li>
                  <li>Принять оплату</li>
                  <li>Зафиксировать в системе учета платежей</li>
                </ol>
              </div>

              <div className={styles.processCard}>
                <h4>Расчеты по доставке в другие города</h4>
                <ol className={styles.orderedList}>
                  <li>Рассчитать ставку по доставке</li>
                  <li>Согласовать с клиентом или менеджером</li>
                  <li>Зафиксировать расчет</li>
                  <li>После доставки сравнить с реальными тратами</li>
                  <li>Внести корректировки в учет</li>
                </ol>
              </div>
            </div>

            <div className={styles.card}>
              <h3 className={styles.cardTitle}>4.3 Оформление заказов</h3>
              
              <div className={styles.processCard}>
                <h4>Через ТК</h4>
                <ol className={styles.orderedList}>
                  <li>Выбрать транспортную компанию</li>
                  <li>Рассчитать стоимость доставки</li>
                  <li>Оформить заказ на сайте ТК</li>
                  <li>Получить трек-номер</li>
                  <li>Передать трек-номер клиенту</li>
                  <li>Отслеживать статус доставки</li>
                </ol>
              </div>

              <div className={styles.processCard}>
                <h4>Прямыми машинами</h4>
                <ol className={styles.orderedList}>
                  <li>Связаться с диспетчером</li>
                  <li>Согласовать маршрут и стоимость</li>
                  <li>Забронировать машину</li>
                  <li>Передать информацию экспедитору</li>
                  <li>Контролировать выполнение</li>
                </ol>
              </div>
            </div>

            <div className={styles.card}>
              <h3 className={styles.cardTitle}>4.4 Обработка рекламаций</h3>
              <ol className={styles.orderedList}>
                <li>Принять рекламацию от клиента</li>
                <li>Зафиксировать детали проблемы</li>
                <li>Согласовать выезд для исправления</li>
                <li>Организовать доставку/ремонт</li>
                <li>Проконтролировать выполнение</li>
                <li>Получить подтверждение от клиента</li>
                <li>Зафиксировать в системе</li>
              </ol>
            </div>

            <div className={styles.card}>
              <h3 className={styles.cardTitle}>4.5 Учёт и отчётность</h3>
              <ul className={styles.list}>
                <li><strong>Учет доставок:</strong> Все доставки фиксируются в CRM с указанием статуса, даты, стоимости</li>
                <li><strong>Учет платежей:</strong> Все платежи по хранению фиксируются в системе учета платежей</li>
                <li><strong>Учет расчетов:</strong> Все расчеты по доставкам в города и реальные траты фиксируются в таблице учета</li>
                <li><strong>Ежедневный отчет:</strong> Формируется до 18:00 и отправляется руководителю</li>
              </ul>
            </div>
          </section>

          {/* Регламенты */}
          <section id="standards" className={styles.section}>
            <h2 className={styles.sectionTitle}>5. Регламенты и стандарты</h2>
            
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Время реакции</h3>
              <ul className={styles.list}>
                <li><strong>На сообщения клиентов:</strong> в течение 15 минут в рабочее время</li>
                <li><strong>На заявки на отгрузку:</strong> в течение 1 часа</li>
                <li><strong>На рекламации:</strong> немедленно, в течение 30 минут</li>
                <li><strong>На запросы коллег:</strong> в течение 2 часов</li>
              </ul>
            </div>

            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Качество коммуникации</h3>
              <ul className={styles.list}>
                <li>Всегда вежливый и профессиональный тон</li>
                <li>Полные и точные ответы на вопросы</li>
                <li>Проактивное информирование о статусах</li>
                <li>Использование проверенной информации</li>
                <li>Документирование важных договоренностей</li>
              </ul>
            </div>

            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Документальное оформление</h3>
              <ul className={styles.list}>
                <li>Все согласования фиксируются в CRM</li>
                <li>Важные договоренности подтверждаются письменно</li>
                <li>Отчеты формируются по установленному шаблону</li>
                <li>Все платежи документируются</li>
              </ul>
            </div>
          </section>

          {/* Контакты */}
          <section id="contacts" className={styles.section}>
            <h2 className={styles.sectionTitle}>6. Контакты и коммуникации</h2>
            
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Внутренние контакты</h3>
              <div className={styles.contactGrid}>
                <div className={styles.contactCard}>
                  <h4>Руководитель отдела логистики</h4>
                  <p>Телефон: [номер]</p>
                  <p>Email: [email]</p>
                  <p>Telegram: [username]</p>
                </div>
                <div className={styles.contactCard}>
                  <h4>Менеджеры по производству</h4>
                  <p>Телефон: [номер]</p>
                  <p>Чат: [ссылка]</p>
                </div>
                <div className={styles.contactCard}>
                  <h4>Склад</h4>
                  <p>Телефон: [номер]</p>
                  <p>Чат: [ссылка]</p>
                </div>
                <div className={styles.contactCard}>
                  <h4>Экспедиторы</h4>
                  <p>Диспетчер: [номер]</p>
                  <p>Чат: [ссылка]</p>
                </div>
              </div>
            </div>

            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Поставщики и грузоперевозчики</h3>
              <div className={styles.contactGrid}>
                <div className={styles.contactCard}>
                  <h4>ТК Деловые Линии</h4>
                  <p>Телефон: 8-800-100-45-45</p>
                  <p>Email: info@dellin.ru</p>
                </div>
                <div className={styles.contactCard}>
                  <h4>ТК ПЭК</h4>
                  <p>Телефон: 8-800-700-33-55</p>
                  <p>Email: info@pecom.ru</p>
                </div>
                <div className={styles.contactCard}>
                  <h4>Прямые машины</h4>
                  <p>Диспетчер: [номер]</p>
                  <p>Чат: [ссылка]</p>
                </div>
              </div>
            </div>
          </section>

          {/* Работа с клиентами */}
          <section id="client-communication" className={styles.section}>
            <h2 className={styles.sectionTitle}>7. Работа с клиентами</h2>
            
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Принципы общения с клиентами</h3>
              <div className={styles.principlesList}>
                <div className={styles.principleItem}>
                  <span className={styles.principleNumber}>1</span>
                  <div>
                    <h4>Клиент всегда прав</h4>
                    <p>Даже если клиент ошибается, наша задача — найти решение, которое его удовлетворит. Мы работаем в формате клиентократии.</p>
                  </div>
                </div>
                <div className={styles.principleItem}>
                  <span className={styles.principleNumber}>2</span>
                  <div>
                    <h4>Проактивная коммуникация</h4>
                    <p>Не ждите вопросов клиента — информируйте его заранее о статусе заказа, возможных задержках, изменениях.</p>
                  </div>
                </div>
                <div className={styles.principleItem}>
                  <span className={styles.principleNumber}>3</span>
                  <div>
                    <h4>Эмпатия и понимание</h4>
                    <p>Поставьте себя на место клиента. Премиум-мебель — это важная покупка, и клиент переживает за результат.</p>
                  </div>
                </div>
                <div className={styles.principleItem}>
                  <span className={styles.principleNumber}>4</span>
                  <div>
                    <h4>Прозрачность и честность</h4>
                    <p>Всегда говорите правду, даже если она неприятна. Лучше честно сообщить о задержке, чем обещать невозможное.</p>
                  </div>
                </div>
                <div className={styles.principleItem}>
                  <span className={styles.principleNumber}>5</span>
                  <div>
                    <h4>Быстрая реакция</h4>
                    <p>Отвечайте на сообщения клиентов в течение 15 минут. Это показывает, что они важны для вас.</p>
                  </div>
                </div>
                <div className={styles.principleItem}>
                  <span className={styles.principleNumber}>6</span>
                  <div>
                    <h4>Персонализация</h4>
                    <p>Обращайтесь к клиенту по имени, помните детали предыдущих разговоров, показывайте индивидуальный подход.</p>
                  </div>
                </div>
                <div className={styles.principleItem}>
                  <span className={styles.principleNumber}>7</span>
                  <div>
                    <h4>Решение проблем, а не объяснение причин</h4>
                    <p>Клиенту не важно, почему произошла проблема. Ему важно, как быстро вы её решите.</p>
                  </div>
                </div>
                <div className={styles.principleItem}>
                  <span className={styles.principleNumber}>8</span>
                  <div>
                    <h4>Предложение альтернатив</h4>
                    <p>Если что-то невозможно, предложите альтернативное решение. Не просто говорите "нет".</p>
                  </div>
                </div>
                <div className={styles.principleItem}>
                  <span className={styles.principleNumber}>9</span>
                  <div>
                    <h4>Благодарность и признательность</h4>
                    <p>Благодарите клиента за терпение, за выбор нашей компании. Показывайте, что цените его.</p>
                  </div>
                </div>
                <div className={styles.principleItem}>
                  <span className={styles.principleNumber}>10</span>
                  <div>
                    <h4>Следование обещаниям</h4>
                    <p>Если вы что-то пообещали — обязательно выполните. Если не можете — немедленно сообщите и предложите компенсацию.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Скрипты */}
          <section id="scripts" className={styles.section}>
            <h2 className={styles.sectionTitle}>8. Скрипты для работы с клиентами</h2>
            
            <div className={styles.card}>
              <div className={styles.scriptsHeader}>
                <h3 className={styles.cardTitle}>Редактируемая база скриптов</h3>
                <button onClick={addScript} className={styles.addButton}>+ Добавить скрипт</button>
              </div>
              
              <div className={styles.scriptsGrid}>
                {scripts.map((script) => (
                  <div key={script.id} className={styles.scriptCard} contentEditable suppressContentEditableWarning>
                    <div className={styles.scriptHeader}>
                      <h4>{script.title}</h4>
                      <span className={styles.scriptCategory}>{script.category}</span>
                    </div>
                    <p className={styles.scriptText}>{script.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}

