process.env.NODE_ENV === "test";

const request = require('supertest');
const app = require('../app');
const db = require('../db');


//seed test database with data.sql before testing
beforeEach(async function () {
    await db.query(`DROP TABLE IF EXISTS invoices;
   DROP TABLE IF EXISTS companies;
   
   CREATE TABLE companies (
       code text PRIMARY KEY,
       name text NOT NULL UNIQUE,
       description text
   );
   
   CREATE TABLE invoices (
       id serial PRIMARY KEY,
       comp_code text NOT NULL REFERENCES companies ON DELETE CASCADE,
       amt float NOT NULL,
       paid boolean DEFAULT false NOT NULL,
       add_date date DEFAULT CURRENT_DATE NOT NULL,
       paid_date date,
       CONSTRAINT invoices_amt_check CHECK ((amt > (0)::double precision))
   );
   
   INSERT INTO companies
     VALUES ('apple', 'Apple Computer', 'Maker of OSX.'),
            ('ibm', 'IBM', 'Big blue.');
   
   INSERT INTO invoices (comp_Code, amt, paid, paid_date)
     VALUES ('apple', 100, false, null),
            ('apple', 200, false, null),
            ('apple', 300, true, '2018-01-01'),
            ('ibm', 400, false, null);`)
})


afterAll(async function () {
    // close db connection
    await db.end();
});


describe("GET /companies", () => {
    test("Get all companies", async () => {
        const res = await request(app).get("/companies");
        expect(res.statusCode).toBe(200)
        expect(res.body).toEqual({
            "companies": [
                {
                    "code": "apple",
                    "name": "Apple Computer"
                },
                {
                    "code": "ibm",
                    "name": "IBM"
                }

            ]
        })
    })
})

describe("GET /companies/:code", () => {
    test("Get company by code", async () => {
        const res = await request(app).get(`/companies/ibm`);
        expect(res.statusCode).toBe(200)
        expect(res.body).toEqual({
            "company": {
                "code": "ibm",
                "name": "IBM",
                "description": "Big blue.",
                "invoices": [
                    {
                        "id": 4,
                        "comp_code": "ibm",
                        "amt": 400,
                        "paid": false,
                        "add_date": "2021-05-03T05:00:00.000Z",
                        "paid_date": null
                    }
                ]
            }
        })
    })

    test("Responds with 404 for invalid company", async () => {
        const res = await request(app).get(`/companies/goggly`);
        expect(res.statusCode).toBe(404)
    })
})


describe("POST /companies", () => {
    test("Creating a new company", async () => {
        let company = { code: "goog", name: "Google", description: "a really big company" };
        const res = await request(app).post("/companies").send(company);
        expect(res.statusCode).toBe(201);
        expect(res.body).toEqual({ company: company });
    })
    test("Responds with 500 if code is missing", async () => {
        const res = await request(app).post("/companies").send({ name: "Google", description: "a really big company" });
        expect(res.statusCode).toBe(500);
    })
    test("Responds with 500 if name is missing", async () => {
        const res = await request(app).post("/companies").send({ code: "goog", description: "a really big company" });
        expect(res.statusCode).toBe(500);
    })
    test("Responds with 500 if description missing", async () => {
        const res = await request(app).post("/companies").send({ code: "goog", name: "Google" });
        expect(res.statusCode).toBe(500);
    })
})


describe("/PATCH /companies/:code", () => {
    test("Updating a company", async () => {
        const ibm = { code: "ibm", name: "IBMM", description: "different description" }
        const res = await request(app).patch(`/companies/ibm`).send({ name: "IBMM", description: "different description" });
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({ company: ibm });
    })
    test("Responds with 404 for invalid code in request", async () => {
        const res = await request(app).patch(`/companies/fake`).send({ name: 'fakeCompany', description: 'fake description' });
        expect(res.statusCode).toBe(404);
    })
    test("Responds with 500 for no name in request", async () => {
        const res = await request(app).patch(`/companies/ibm`).send({ description: 'fake description' });
        expect(res.statusCode).toBe(500);
    })
    test("Responds with 500 for no description in request", async () => {
        const res = await request(app).patch(`/companies/ibm`).send({ name: 'fakeCompany' });
        expect(res.statusCode).toBe(500);
    })
})


describe("/DELETE /companies/:code", () => {
    test("Deleting a company", async () => {
        const res = await request(app).delete(`/companies/ibm`);
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({ status: 'deleted' })
    })
    test("Responds with 404 for deleting invalid item", async () => {
        const res = await request(app).delete(`/companies/notacompany`);
        expect(res.statusCode).toBe(404);
    })
})